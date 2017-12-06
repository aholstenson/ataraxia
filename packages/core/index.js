'use strict';

const { EventEmitter } = require('events');
const debug = require('debug')('ataraxia');

const Node = require('./node');
const id = require('./id');

const Topology = require('./topology');

const topologySymbol = Symbol('topology');
const events = Symbol('events');

const nodesSymbol = Symbol('nodes');

module.exports = class Network {
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
		});

		topology.on('unavailable', n => {
			const node = nodes.get(n.id);
			if(! node) return;

			nodes.delete(n.id);
			this[events].emit('node:unavailable', node);
		});

		topology.on('message', msg => {
			const node = nodes.get(msg.returnPath.id);
			this[events].emit('message', {
				returnPath: node,
				type: msg.type,
				data: msg.data
			});
		});
	}

	on(event, listener) {
		this[events].on(event, listener);
	}

	off(event, listener) {
		this[events].removeListener(event, listener);
	}

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
		debug('About to join network as ' + this.id);

		this.active = true;

		const options = {
			id: this.id,
			name: this.name,
			endpoint: this.endpoint
		};

		for(const transport of this.transports) {
			transport.start(options);
		}
	}

	/**
	* Leave the currently joined network.
	*/
	stop() {
		this.transports.forEach(t => t.leave());

		this.active = false;
	}

	/**
	* Broadcast a message some nodes.
	*/
	broadcast(type, payload, options=null) {
		// Send to all connected nodes
		for(const node of this[nodesSymbol].values()) {
			node.send(type, payload);
		}
	}
};
