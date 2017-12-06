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

		network.on('message', this._handleMessage.bind(this));
		network.on('node:available', this._handleNodeAvailable.bind(this));
		network.on('node:unavailable', this._handleNodeUnavailable.bind(this));
	}

	get id() {
		return this.network.id;
	}

	_handleNodeAvailable(node) {
		/*
		 * When we connect to a new node, send the node all of the local
		 * services we provide.
		 */
		for(const service of this.services.values()) {
			if(service instanceof LocalService) {
				node.send('service:available', service.definition);
			}
		}
	}

	_handleNodeUnavailable(node) {
		for(const service of this.services.values()) {
			if(service instanceof RemoteService && service.node.id === node.id) {
				this._handleServiceUnavailable0(service);
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
		const service = new LocalService(this, id, instance);
		this.services.set(id, service);
		this.network.broadcast('service:available', service.definition);

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
		this.network.broadcast('service:unavailable', service.definition);

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

	_handleMessage(msg) {
		switch(msg.type) {
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

	_handleServiceAvailable(node, data) {
		debug('Service', data.id, 'available via', node);

		let service = this.services.get(data.id);
		if(! service) {
			service = new RemoteService(this, node, data);
			this.services.set(data.id, service);

			this.events.emit('available', service.proxy);
		} else {
			service.updateDefinition(data);
			this.events.emit('available', service.proxy);
		}
	}

	_handleServiceUnavailable(node, data) {
		debug('Service', data.id, 'is no longer available via', node);

		// Get the service and protect against unknown service
		let service = this.services.get(data.id);
		if(! (service instanceof RemoteService)) return;

		this._handleServiceUnavailable0(service);
	}

	_handleServiceUnavailable0(service) {
		debug(service.id, 'is no longer available');
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
