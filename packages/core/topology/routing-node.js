'use strict';

const isDeepEqual = require('deep-equal');

function reachabilityComparator(a, b) {
	return a.path.length - b.path.length;
}

/**
 * Node in the network topology. Nodes are disovered using broadcasts from
 * peers.
 *
 * Reachability to different peers is tracked in the `reachability` array
 * which is sorted so the shortest path is available as the first element.
 */
module.exports = class Node {
	constructor(network, id) {
		this.network = network;
		this.id = id;

		this.reachability = [];
	}

	/**
	 * Forward a message from the given source to this node.
	 */
	forward(source, message) {
		if(! this.peer) return;

		this.peer.send([ source, this.id, message ]);
	}

	/**
	 * Send a message to this node.
	 */
	send(type, data) {
		if(! this.peer) return;

		this.peer.send([ this.network.id, this.id, { type, data } ]);
	}

	/**
	* Get the number of hops that are required to reach this node from the
	* local node.
	*/
	get distance() {
		if(this.reachability.length === 0) return -1;

		return this.reachability[0].path.length;
	}

	/**
	 * Get the path used to reach this node.
	 */
	get path() {
		return this.reachability.length > 0 ? this.reachability[0].path : [];
	}

	/**
	 * Get if this node is currently reachable.
	 */
	get reachable() {
		return this.reachability.length > 0;
	}

	/**
	 * Indicate that this node can be reached via the given peer.
	 */
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
		this.updateReachability();
		return true;
	}

	/**
	 * Indicate that this node can no longer be reached via the given peer.
	 */
	removeReachability(peer) {
		const idx = this.reachability.findIndex(d => d.peer.id == peer.id);
		if(idx < 0) return false;

		this.reachability.splice(idx, 1);

		// Sort and update how this node is reached
		this.updateReachability();
		return true;
	}

	/**
	 * Recalculate and get how this node is reachable.
	 */
	updateReachability() {
		this.reachability.sort(reachabilityComparator);

		if(this.reachable) {
			this.peer = this.reachability[0].peer;
			this.direct = this.reachability[0].path.length === 0;
		} else {
			this.peer = null;
			this.direct = false;
		}
	}
};
