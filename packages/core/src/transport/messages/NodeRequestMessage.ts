/**
 * Message sent when a peer wants more information about the nodes seen by
 * another peer.
 */
export interface NodeRequestMessage {
	/**
	 * The nodes the peer is interested in receiving information about.
	 */
	nodes: ArrayBuffer[];
}
