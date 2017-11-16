'use strict';

function reachabilityComparator(a, b) {
	return a.path.length - b.path.length;
}

/**
 * Node in the network. Keeps track of how it can be reached.
 */
module.exports = class Node {
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
}
