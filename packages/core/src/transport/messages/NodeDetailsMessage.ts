/**
 * Details about the routing of several nodes.
 */
export interface NodeDetailsMessage {
	/**
	 * Nodes as requested.
	 */
	nodes: NodeRoutingDetails[];
}

/**
 * Details about the routing for a specific node.
 */
export interface NodeRoutingDetails {
	/**
	 * The identifier of the node.
	 */
	id: ArrayBuffer;

	/**
	 * The version of the node.
	 */
	version: number;

	/**
	 * The neighbors of the node, including latency information.
	 */
	neighbors: NodeWithLatency[];
}

export interface NodeWithLatency {
	/**
	 * The identifier of the node.
	 */
	id: ArrayBuffer;

	/**
	 * The latency between this node and the parent node in
	 * `NodeRoutingDetails`.
	 */
	latency: number;
}
