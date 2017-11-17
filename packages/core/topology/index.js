'use strict';

const debug = require('debug')('ataraxia:topology');
const EventEmitter = require('events');
const hasSeen = Symbol('hasSeen');
const Node = require('./routing-node');

/**
 * Information about the topology of the network.
 */
module.exports = class Topology {
	constructor(network, options) {
		this.network = network;
		this.endpoint = options.endpoint;

		this.events = new EventEmitter();

		this.nodes = new Map();
		this.peers = new Map();
	}

	on(event, handler) {
		this.events.on(event, handler);
	}

	get(id, create=true) {
		let node = this.nodes.get(id);
		if(! node && create) {
			node = new Node(this.network, id);
			this.nodes.set(id, node);
		}

		return node;
	}

	get nodelist() {
		return this.nodes.values();
	}

	addReachability(node, peer, data) {
		const wasReachable = node.reachable;

		if(node.addReachability(peer, data)) {
			// Reachability changed, tell our peers about this
			this.queueBroadcast();
		}

		if(! wasReachable) {
			debug('Node', node.id, 'now reachable');
			this.events.emit('available', node);
		}
	}

	removeReachability(node, peer) {
		const wasReachable = node.reachable;

		// TODO: Timeout so that node is not made unavailable directly?
		if(node.removeReachability(peer)) {
			// Reachability changed, tell our peers about this
			this.queueBroadcast();
		}

		if(! node.reachable && wasReachable) {
			debug('Node', node.id, 'no longer reachable');
			this.nodes.delete(node.id);
			this.events.emit('unavailable', node);
		}
	}

	addPeer(peer) {
		// Create or update the node
		this.peers.set(peer.id, peer);

		if(! peer[hasSeen]) {
			// Handle node updates for this peer
			peer.on('nodes', data => this.handleNodes(peer, data));

			// Handle messages via the peer, either reroute them or emit them
			peer.on('message', msg => this.handleMessage(peer, msg));

			// If the peer is disconnected remove it
			peer.on('disconnected', () => {
				this.peers.delete(peer.id);

				this.handleDisconnect(peer);
			});

			// Track that we have listeners on the peer
			peer[hasSeen] = true;
		}

		// Create or get the node and mark it as reachable
		const node = this.get(peer.id);
		this.addReachability(node, peer, []);
	}

	/**
	 * Handle incoming node information.
	 */
	handleNodes(peer, data) {
		// Add the current peer to available items so that is not removed later
		const available = new Set();
		available.add(peer.id);

		// Expose all of the peers that can be seen by the other node
		for(const p of data) {
			if(p.id === this.network.id) continue;

			const node = this.get(p.id);
			this.addReachability(node, peer, [ peer.id, ...p.path ]);

			available.add(p.id);
		}

		// Go through the peers and remove the peer from others
		for(const other of this.nodes.values()) {
			if(! available.has(other.id)) {
				this.removeReachability(other, peer);
			}
		}
	}

	handleDisconnect(peer) {
		for(const node of this.nodes.values()) {
			this.removeReachability(node, peer);
		}
	}

	handleMessage(peer, msg) {
		const source = msg[0];
		const target = msg[1];
		const message = msg[2];


		const targetNode = this.nodes.get(target);
		const sourceNode = this.nodes.get(source);


		// Protect against messages from unknown nodes
		if(! sourceNode) return;

		if(target !== this.network.id) {
			// This message should be routed to another node, resolve and forward
			if(targetNode && targetNode.reachable) {
				targetNode.forward(source, message);
			}
		} else {
			// Emit event for all other messages
			this.events.emit('message', {
				returnPath: sourceNode,
				type: message.type,
				data: message.data
			});
		}
	}

	/**
	 * Queue that we should broadcast information about our nodes to our
	 * peers.
	 */
	queueBroadcast() {
		// Endpoints do not perform routing, never broadcast routing info
		if(this.endpoint) return;

		// A broadcast is scheduled
		if(this.broadcastTimeout) return;

		this.broadcastTimeout = setTimeout(() => {
			if(debug.enabled) {
				debug('Broadcasting routing to all connected peers');
				debug('Peers:', Array.from(this.peers.keys()).join(', '));

				debug('Nodes:')
				for(const node of this.nodes.values()) {
					debug(node.id, 'via', node.path.join(' -> '));
				}
			}

			/*
			 * TODO: If this format changes bump the peer version and use
			 * that to determine format of message to send to each peer.
			 */
			const nodes = [];
			for(const node of this.nodes.values()) {
				nodes.push({
					id: node.id,
					path: node.path
				});
			}

			for(const peer of this.peers.values()) {
				peer.write('nodes', nodes);
			}

			this.broadcastTimeout = null;
		}, 100);
	}
}
