/**
 * Message used during connection with a peer.
 */
export interface HelloMessage {
	/**
	 * The identifier of this peer.
	 */
	id: ArrayBuffer;

	/**
	 * The version of the protocol the peer supports.
	 */
	capabilities: Set<string>;
}
