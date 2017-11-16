'use strict';

const { EventEmitter } = require('events');
const debug = require('debug')('th:net');

const id = require('./id');

const hasSeen = Symbol('hasSeen');

module.exports = class Network {
	constructor(options={}) {
		if(! options.name) throw new Error('name of network is required');

		this.events = new EventEmitter();

		this.id = id();
		this.name = options.name;

		this.on = this.events.on.bind(this.events);
		this.off = this.events.removeListener.bind(this.events);

		this.nodes = new Map();
		this.transports = [];

		this.active = false;
	}

	addTransport(transport) {
		this.transports.push(transport);

		transport.on('connected', peer => {
			const node = new Node(this, peer.id);
			node.addReachability(peer, []);

			if(! peer[hasSeen]) {
				// Register listeners, but only if we haven't done so before
				peer[hasSeen] = true;

				peer.on('message', msg => this._handleMessage(peer, msg));
				peer.on('disconnected', () => this._peerDisconnected(peer, node));
			}

			this._peerConnected(peer, node);
		});

		if(this.active) {
			transport.start({
				id: this.id,
				name: this.name
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
			name: this.name
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

	_peerConnected(peer, node) {
		debug('Connected to', peer);

		// Store reference to this peer
		this.nodes.set(node.id, node);

		// Broadcast all of our peers
		this._broadcastRouting();

		// Emit an event to indicate that we are now connected
		this.events.emit('node:available', node);
	}

	_peerDisconnected(peer, wrapped) {
		debug('Disconnected from', peer);

		// Remove the peer
		this._handlePeerRemoval(peer);

		// Queue a broadcast of our updated peer info
		this._broadcastRouting();
	}

	_handlePeerRemoval(peer, node) {
		// Update all of the peers and remove this one
		for(const other of this.nodes.values()) {
			other.removeReachability(peer);
			if(! other.reachable) {
				debug('Can no longer reach', other);

				this.nodes.delete(other.id);
				this.events.emit('node:unavailable', other);
			}
		}
	}

	_handleMessage(peer, data) {
		const source = data[0];
		const target = data[1];
		const message = data[2];

		const targetNode = this.nodes.get(target);
		const sourceNode = this.nodes.get(source);

		if(target !== this.id) {
			// This message should be routed to another node, resolve and forward
			if(targetNode && targetNode.reachable) {
				targetNode.forward(source, message);
			}
		} else {
			// TODO: We need to have information about the peer that initiated a message
			switch(message.type) {
				case 'routing':
					this._handleRouting(peer, message.payload);
					break;
				default:
					// Emit event for all other messages
					this.events.emit('message', {
						returnPath: sourceNode,
						type: message.type,
						payload: message.payload
					});
					break;
			}
		}
	}

	_routingMessage() {
		const peers = [];
		for(const p of this.nodes.values()) {
			peers.push({
				id: p.id,
				path: p.path
			});
		}
		return peers;
	}

	/**
	* Queue up a broadcast to directly connected peers about all of the
	* peers we can see.
	*/
	_broadcastRouting() {
		if(this._peerTimeout) {
			return;
		}

		this._peerTimeout = setTimeout(() => {
			this._peerTimeout = null;

			this.broadcast('routing', this._routingMessage(), { onlyDirect: true });
		}, 500);
	}

	_handleNodeAvailable(peer, data) {
		if(data.id === this.id) return false;

		// Get or create the node
		let node = this.nodes.get(data.id);
		if(! node) {
			node = new Node(this, data.id);
			this.nodes.set(data.id, node);
		}

		// Update the reachability of the node
		let emitEvent = ! node.reachable;
		if(node.addReachability(peer, [ peer.id, ...data.path ])) {
			if(emitEvent && node.reachable) {
				debug('Can now reach', node.id, 'via', peer);
				this.events.emit('node:available', node);
			}

			return true;
		}

		return false;
	}

	/**
	* Handle routing information from a given peer.
	*/
	_handleRouting(peer, data) {
		const available = new Set();
		// Add the current peer to available items so that is not removed later
		available.add(peer.id);

		let changed = false;

		// Expose all of the peers that can be seen by the other node
		for(const p of data) {
			changed |= this._handleNodeAvailable(peer, p);
			available.add(p.id);
		}

		// Go through the peers and remove the peer from others
		for(const other of this.nodes.values()) {
			if(! available.has(other.id)) {
				if(other.removeReachability(peer)) {
					changed = true;

					if(! other.reachable) {
						debug('Can no longer reach', other);

						this.nodes.delete(other.id);
						this.events.emit('node:unavailable', other);
					}
				}
			}
		}

		if(changed) {
			this._broadcastRouting();
		}
	}

	/**
	* Broadcast a message some nodes.
	*/
	broadcast(type, payload, options=null) {
		if(options && options.onlyDirect) {
			// Only sending to directly connect nodes
			for(const node of this.nodes.values()) {
				if(node.direct) {
					node.send(type, payload);
				}
			}
		} else {
			// Send to all connected nodes
			for(const node of this.nodes.values()) {
				node.send(type, payload);
			}
		}
	}
}

function reachabilityComparator(a, b) {
	return a.path.length - b.path.length;
}

class Node {
	constructor(network, id) {
		this.network = network;
		this.id = id;

		this.reachability = [];
	}

	forward(source, message) {
		if(! this.peer) return;

		this.peer.send([ source, this.id, message ]);
	}

	send(type, payload) {
		if(! this.peer) return;

		this.peer.send([ this.network.id, this.id, { type, payload } ]);
	}

	/**
	* Get the number of nodes
	*/
	get distance() {
		if(this.reachability.length === 0) return 20000;

		return this.reachability[0].path.length;
	}

	get path() {
		return this.reachability.length > 0 ? this.reachability[0].path : [];
	}

	get reachable() {
		return this.reachability.length > 0;
	}

	addReachability(peer, path) {
		const idx = this.reachability.findIndex(d => d.peer == peer);
		if(idx >= 0) return false;

		if(path.indexOf(this.id) >= 0 || path.indexOf(this.network.id) >= 0) {
			// This peer is either reached via itself or via this node, skip this routing
			return false;
		}

		this.reachability.push({
			peer,
			path
		});

		this.reachability.sort(reachabilityComparator);

		this.updateReachability();
		return true;
	}

	removeReachability(peer) {
		const idx = this.reachability.findIndex(d => d.peer == peer);
		if(idx < 0) return false;

		this.reachability.splice(idx, 1);
		this.reachability.sort(reachabilityComparator);

		this.updateReachability();

		return true;
	}

	updateReachability() {
		if(this.reachable) {
			this.peer = this.reachability[0].peer;
			this.direct = this.reachability[0].path.length === 0;
		} else {
			this.peer = null;
			this.direct = false;
		}
	}
};
