'use strict';

const isDeepEqual = require('deep-equal');

function reachabilityComparator(a, b) {
	return a.path.length - b.path.length;
}

/**
 * Discovered Node via routing information
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

	send(type, data) {
		if(! this.peer) return;

		this.peer.send([ this.network.id, this.id, { type, data } ]);
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
		const routedViaHostNode = path.indexOf(this.id) >= 0 || path.indexOf(this.network.id) >= 0;

		const idx = this.reachability.findIndex(d => d.peer.id == peer.id);
		if(idx >= 0) {
			// This routing is currently available, but might have been updated
			if(routedViaHostNode) {
				// This node is now reachable via the host, so we should remove it
				this.reachability.splice(idx, 1);
			} else {
				if(isDeepEqual(this.reachability[idx].path, path)) {
					// Paths are equal, skip updating
					return false;
				} else {
					// Update the path to the new one
					this.reachability[idx].path = path;
				}
			}
		} else {
			if(routedViaHostNode) {
				// This node is reachable via the host, so not really reachable via the given peer
				return false;
			}

			this.reachability.push({
				peer,
				path
			});
		}

		// Sort and update how this node is reached
		this.reachability.sort(reachabilityComparator);
		this.updateReachability();
		return true;
	}

	removeReachability(peer) {
		const idx = this.reachability.findIndex(d => d.peer.id == peer.id);
		if(idx < 0) return false;

		this.reachability.splice(idx, 1);

		// Sort and update how this node is reached
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
