'use strict';

const { EventEmitter } = require('events');
const debug = require('debug')('ataraxia');

const Node = require('./node');
const id = require('./id');

const Topology = require('./topology');

const topologySymbol = Symbol('topology');
const events = Symbol('events');

const nodesSymbol = Symbol('nodes');

/**
 * Network of nodes. The network is the main class in Ataraxia and uses one or
 * more transports to connect to peers and discover nodes in the network.
 *
 * Networks are required to have a name which represents a short name that
 * describes the network. Transports can use this name to automatically find
 * peers with the same network name.
 */
module.exports = class Network {

	/**
	 * Create a new network. A network must be provided a `name` which is a
	 * short string used that transports may use to discover peers. Such a
	 * short name is usually something like `app-name` or `known-network-name`.
	 *
	 * These options are available:
	 *
	 * * `name` - the name of the network
	 * * `endpoint` - boolean indicating if this instance is an endpoint and
	 *    wants to avoid routing.
	 *
	 * @param {object} options
	 *   The options of the network.
	 */
	constructor(options={}) {
		if(! options.name) throw new Error('name of network is required');

		this[events] = new EventEmitter();

		this.id = id();
		this.name = options.name;
		this.endpoint = options.endpoint || false;

		this.transports = [];

		this.active = false;

		// Setup the topology of the network
		const topology = this[topologySymbol] = new Topology(this, options);
		const nodes = this[nodesSymbol] = new Map();
		topology.on('available', n => {
			const node = new Node(n);
			nodes.set(n.id, node);
			this[events].emit('node:available', node);
			node.emit('available');
		});

		topology.on('unavailable', n => {
			const node = nodes.get(n.id);
			if(! node) return;

			nodes.delete(n.id);
			this[events].emit('node:unavailable', node);
			node.emit('unavailable');
		});

		topology.on('message', msg => {
			const node = nodes.get(msg.returnPath.id);

			const event = {
				returnPath: node,
				type: msg.type,
				data: msg.data
			};

			this[events].emit('message', event);
			node.emit('message', event);
		});
	}

	/**
	 * Listen to events from this network.
	 *
	 * Supported events:
	 *
	 * * `node:available` - a node is now available
	 * * `node:unavailable` - a node is no longer available
	 * * `message` - a message has been received
	 *
	 * @param {string} event
	 * @param {function} listener
	 */
	on(event, listener) {
		this[events].on(event, listener);
	}

	/**
	 * Remove a previously registered event listener.
	 *
	 * @param {string} event
	 * @param {function} listener
	 */
	off(event, listener) {
		this[events].removeListener(event, listener);
	}

	/**
	 * Add a transport to this network. If the network is started the transport
	 * will also be started.
	 */
	addTransport(transport) {
		this.transports.push(transport);

		// Whenever a peer is connected send it to the topology
		transport.on('connected', peer => this[topologySymbol].addPeer(peer));

		if(this.active) {
			transport.start({
				id: this.id,
				name: this.name,
				endpoint: this.endpoint
			});
		}
	}

	/**
	* Join the network by starting a server and then looking for peers.
	*/
	start() {
		if(this.active) return Promise.resolve(false);

		debug('About to join network as ' + this.id);

		const options = {
			id: this.id,
			name: this.name,
			endpoint: this.endpoint
		};

		return Promise.all(
			this.transports.map(t => t.start(options))
		).then(() => {
			this.active = true;
			return true;
		});
	}

	/**
	* Leave the currently joined network.
	*/
	stop() {
		if(! this.active) return Promise.resolve(false);

		return Promise.all(
			this.transports.map(t => t.stop())
		).then(() => {
			this.active = false;
			return true;
		});
	}

	/**
	* Broadcast a message to all nodes.
	*
	* @param {string} type
	*   the type of message to send
	* @param {*} payload
	*   the payload of the message
	*/
	broadcast(type, payload) {
		// Send to all connected nodes
		for(const node of this[nodesSymbol].values()) {
			node.send(type, payload);
		}
	}
};
