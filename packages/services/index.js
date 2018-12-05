'use strict';

const debug = require('debug')('ataraxia:services');
const { EventEmitter } = require('events');

const RemoteService = require('./service-remote');
const LocalService = require('./service-local');

/*
 * Distributed service registry that provides access to both local and remote
 * services in a seamless way.
 */
module.exports = class Services {
	constructor(network) {
		this.network = network;
		this.events = new EventEmitter();

		this.services = new Map();
		this.version = 1;
		this.nodes = new Map();

		network.on('message', this._handleMessage.bind(this));
		network.on('node:available', this._handleNodeAvailable.bind(this));
		network.on('node:unavailable', this._handleNodeUnavailable.bind(this));
	}

	get id() {
		return this.network.id;
	}

	_handleNodeAvailable(node) {
		// Setup the node and initialize the version we have
		const nodeData = {
			node: node,
			version: 0
		};
		this.nodes.set(node.id, nodeData);

		// Request a list of services
		debug('Requesting initial list of services from', node);
		node.send('service:list', { lastVersion: 0 });

		// Schedule listing around every minute
		function scheduleList() {
			nodeData.listTimer = setTimeout(() => {
				debug('Requesting list of services from', node);
				node.send('service:list', { lastVersion: nodeData.version });
				scheduleList();
			}, 60000 + Math.random() * 5000);
		}
		scheduleList();

		// Set a timer to fallback to broadcasting services
		nodeData.broadcastTimer = setTimeout(() => {
			nodeData.broadcastTimer = null;

			for(const service of this.services.values()) {
				if(service instanceof LocalService) {
					node.send('service:available', service.definition);
				}
			}
		}, 2000);
	}

	_handleNodeUnavailable(node) {
		// Remove the node so we no longer query it
		const nodeData = this.nodes.get(node.id);
		clearTimeout(nodeData.listTimer);
		clearTimeout(nodeData.broadcastTimer);
		this.nodes.delete(node.id);

		// Remove all the remote services of the node
		for(const service of this.services.values()) {
			if(service instanceof RemoteService && service.node.id === node.id) {
				this._handleServiceUnavailable0(node, service);
			}
		}
	}

	/**
	 * Start listening for the given event to be emitted.
	 *
	 * @param {string} event
	 * @param {function} listener
	 */
	on(event, listener) {
		this.events.on(event, listener);
	}

	/**
	 * Remove listener for the given event.
	 *
	 * @param {string} event
	 * @param {function} listener
	 */
	off(event, listener) {
		this.events.removeListener(event, listener);
	}

	/**
	 * Register that a new service is being provided by this node.
	 *
	 * @param {string} id
	 * @param {object} instance
	 */
	register(id, instance) {
		// TODO: How should duplicate services be handled?
		if(typeof id !== 'string') {
			throw new Error('Id is required to register service');
		}

		const service = new LocalService(this, id, instance);
		this.services.set(id, service);

		// Update the version and broadcast this new service
		this.version++;
		const def = Object.assign({ servicesVersion: this.version }, service.definition);
		this.network.broadcast('service:available', def);

		this.events.emit('available', service.proxy);

		return service;
	}

	/**
	 * Remove a previously registered local service.
	 *
	 * @param {string} id
	 */
	remove(id) {
		const service = this.services.get(id);
		if(! service || ! (service instanceof LocalService)) return;

		this.services.delete(service.id);

		// Update the version and broadcast that this service is no longer available
		this.version++;
		const def = Object.assign({ servicesVersion: this.version }, service.definition);
		this.network.broadcast('service:unavailable', def);

		this.events.emit('unavailable', service.proxy);
	}

	/**
	 * Get a local or remove service that is already in the registry.
	 *
	 * @param {string} id
	 */
	get(id) {
		const service = this.services.get(id);
		return service ? service.proxy : null;
	}

	_serviceUpdated(service) {
		// Update the version and broadcast the service
		this.version++;
		const def = Object.assign({ servicesVersion: this.version }, service.definition);
		this.network.broadcast('service:available', def);
	}

	_handleMessage(msg) {
		switch(msg.type) {
			case 'service:list':
				this._handleServiceList(msg.returnPath, msg.data);
				break;
			case 'service:list-result':
				this._handleServiceListResult(msg.returnPath, msg.data);
				break;
			case 'service:available':
				this._handleServiceAvailable(msg.returnPath, msg.data);
				break;
			case 'service:unavailable':
				this._handleServiceUnavailable(msg.returnPath, msg.data);
				break;
			case 'service:subscribe':
				this._handleServiceSubscribe(msg.returnPath, msg.data);
				break;
			case 'service:unsubscribe':
				this._handleServiceUnsubscribe(msg.returnPath, msg.data);
				break;
			case 'service:event':
				this._handleServiceEvent(msg.returnPath, msg.data);
				break;
			case 'service:invoke':
				this._handleServiceInvoke(msg.returnPath, msg.data);
				break;
			case 'service:invoke-result':
				this._handleServiceInvokeResult(msg.returnPath, msg.data);
				break;
		}
	}

	/**
	 * Handle an incoming request to list services.
	 *
	 * Will check if anything has changed since the requested version and if
	 * so sends back a complete list of services.
	 */
	_handleServiceList(node, data) {
		// If the node has seen all of our services, skip reply
		if(data.lastVersion === this.version) return;

		// Mark that the other other node supports service listing, disable broadcast
		const nodeData = this.nodes.get(node.id);
		clearTimeout(nodeData.broadcastTimer);
		nodeData.broadcastTimer = null;

		// Collect the definitions for all of our local services
		const services = [];
		for(const service of this.services.values()) {
			if(service instanceof LocalService) {
				services.push(service.definition);
			}
		}

		if(services.length > 0 || data.lastVersion === 0) {
			// If we have any services send them back
			node.send('service:list-result', {
				servicesVersion: this.version,
				services: services
			});
		}
	}

	/**
	 * Handle an incoming result from a `service:list` request.
	 */
	_handleServiceListResult(node, data) {
		// Figure out which services belong to the node
		const servicesNoLongerAvailable = new Set();
		for(const service of this.services.values()) {
			if(service instanceof RemoteService && service.node.id === node.id) {
				servicesNoLongerAvailable.add(service.id);
			}
		}

		// Handle the incoming list of services
		for(const service of data.services) {
			// Remove from list of services that are unavailable
			servicesNoLongerAvailable.delete(service.id);

			// Add or update the service
			this._handleServiceAvailable0(node, service);
		}

		// Remove the remaining services
		for(const id of servicesNoLongerAvailable) {
			const service = this.services.get(id);

			if(service) {
				// Protect against non-existent services
				this._handleServiceUnavailable0(node, service);
			}
		}

		// Update the version we have seen
		const nodeData = this.nodes.get(node.id);
		nodeData.version = data.servicesVersion;
	}

	/**
	 * Update the last version of a node or request a list of services if
	 * there is a gap.
	 */
	_updateNodeVersion(node, data) {
		if(! data.servicesVersion) return;

		// Check the version being tracked for the node
		const nodeData = this.nodes.get(node.id);
		if(nodeData.version === data.servicesVersion - 1) {
			// The version we have is the previous one, perform a simple update
			nodeData.version = data.servicesVersion;
		} else {
			// There is a gap in our data, request the list of services
			node.send('service:list', { lastVersion: nodeData.version });
		}
	}

	/**
	 * Handle that a new service is available or that it has been updated.
	 */
	_handleServiceAvailable(node, data) {
		// Handle the incoming version information
		this._updateNodeVersion(node, data);

		// Actually handle the message
		this._handleServiceAvailable0(node, data);
	}

	/**
	 * Create or update a remote service based on its definition.
	 */
	_handleServiceAvailable0(node, data) {
		if(! data) {
			// Check that we have some data
			debug('Received empty service via', node);
			return;
		}

		if(! data.id) {
			// Check that we have an identifier
			debug('Received a service without an id via', node);
			return;
		}

		let service = this.services.get(data.id);
		if(! service) {
			// This is a new service, create it and start tracking it
			service = new RemoteService(this, node, data);
			this.services.set(data.id, service);

			debug('Service', data.id, 'available via', node);
			this.events.emit('available', service.proxy);
		} else {
			// This is an existing service, update the definition
			debug('Service', data.id, 'updated via', node);

			if(service.updateDefinition(data)) {
				this.events.emit('updated', service.proxy);
			}
		}
	}

	_handleServiceUnavailable(node, data) {
		// Handle the incoming version information
		this._updateNodeVersion(node, data);

		// Get the service and protect against unknown service
		let service = this.services.get(data.id);
		if(! (service instanceof RemoteService)) return;

		this._handleServiceUnavailable0(node, service);
	}

	_handleServiceUnavailable0(node, service) {
		debug('Service', service.id, 'is no longer available via', node);
		this.services.delete(service.id);
		this.events.emit('unavailable', service.proxy);

		// Destroy the service object
		service.destroy();
	}

	_handleServiceSubscribe(node, message) {
		const service = this.services.get(message.service);
		if(! (service instanceof LocalService)) return;

		service.subscribe(node);
	}

	_handleServiceUnsubscribe(node, message) {
		const service = this.services.get(message.service);
		if(! (service instanceof LocalService)) return;

		service.unsubscribe(node);
	}

	_handleServiceEvent(node, message) {
		const service = this.services.get(message.service);
		if(! (service instanceof RemoteService)) return;

		service.receiveEvent(message.name, message.payload);
	}

	_handleServiceInvoke(node, message) {
		const service = this.services.get(message.service);
		if(! (service instanceof LocalService)) {
			debug('Unknown service, sending back failure');
			node.send('service:invoke-result', {
				service: message.service,
				seq: message.seq,
				error: 'Unknown service'
			});
		} else {
			debug('Invoking', message.action, 'on', service);
			service.call(message.action, message.arguments)
				.then(value => {
					debug(message.action + ' successful:', value);
					node.send('service:invoke-result', {
						service: message.service,
						seq: message.seq,
						result: value
					});
				})
				.catch(err => {
					debug(message.action + ' failed:', err);
					node.send('service:invoke-result', {
						service: message.service,
						seq: message.seq,
						error: String(err)
					});
				});
		}
	}

	_handleServiceInvokeResult(node, message) {
		const service = this.services.get(message.service);
		if(! (service instanceof RemoteService)) return;

		service.receiveReply(message);
	}
};

module.exports.metadataChanged = LocalService.metadataChanged;
