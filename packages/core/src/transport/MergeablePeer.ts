/**
 * Marker for peers that can merge data in from another peer as they are
 * disconnected due to double-connects.
 */
export interface MergeablePeer {
	/**
	 * Merge the data from the other peer into this peer.
	 */
	merge(peer: this): void;
}

/**
 * Get if we can treat the peer as mergeable.
 *
 * @param o
 */
export function isMergeablePeer(o: any): o is MergeablePeer {
	return o && o.merge;
}
