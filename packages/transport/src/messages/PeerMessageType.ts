/**
 * The types of data that a peer can send and receive.
 */
export enum PeerMessageType {
	/**
	 * Generic ok message. Used at certain points during the initial
	 * negotiation with a peer.
	 */
	Ok,

	/**
	 * Generic reject message.
	 */
	Reject,

	/**
	 * Hello data, initial message sent from a server when a client connects.
	 */
	Hello,

	/**
	 * Select message, sent from the client to the server after the client has
	 * received and selected the capabilities it wants.
	 */
	Select,

	/**
	 * Bye, request a graceful disconnect from the peer.
	 */
	Bye,

	/**
	 * Ping message, sent periodically by peers to make sure that other peers
	 * know that they are available.
	 */
	Ping,

	/**
	 * Pong message, sent as a reply when an incoming ping is received.
	 */
	Pong,

	/**
	 * Authentication request, sent by the client after it has received an ok
	 * for its select.
	 */
	Auth,

	/**
	 * Additional authentication data, can be sent by both a client and a
	 * server to provide additional data needed during authentication.
	 */
	AuthData,

	/**
	 * Message that indicates that the client is ready to begin receiving
	 * messages.
	 */
	Begin,

	/**
	 * Information about the nodes a peer sees.
	 */
	NodeSummary,

	/**
	 * Request for details about nodes.
	 */
	NodeRequest,

	/**
	 * Details about nodes.
	 */
	NodeDetails,

	/**
	 * Wrapped message to be forwarded.
	 */
	Data,

	/**
	 * Acknowledgment of having received data.
	 */
	DataAck,

	/**
	 * Rejection of data.
	 */
	DataReject
}
