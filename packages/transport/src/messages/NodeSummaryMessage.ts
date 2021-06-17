/**
 * Message containing a summary of the nodes a peer can see.
 */
export interface NodeSummaryMessage {
	/**
	 * The version number of this routing. This number increases if the peer
	 * detects changes in what peers it is connected to.
	 */
	ownVersion: number;

	/**
	 * Information about the nodes the peer can see.
	 */
	nodes: NodeRoutingSummary[];
}

/**
 * Summary information about the routing for a certain node.
 */
export interface NodeRoutingSummary {
	/**
	 * The identifer of the node.
	 */
	id: ArrayBuffer;

	/**
	 * The version of its routing.
	 */
	version: number;
}
