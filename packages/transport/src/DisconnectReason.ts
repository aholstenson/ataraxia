/**
 * Reason for a disconnect. Used to flag why a peer was disconnected so a
 * transport can take different actions such as reconnecting after a delay or
 * directly.
 */
export enum DisconnectReason {
	/**
	 * Manual disconnect has happened.
	 */
	Manual,

	/**
	 * A generic error occurred while talking to the peer.
	 */
	Error,

	/**
	 * The peer didn't respond to a ping in time.
	 */
	PingTimeout,

	/**
	 * Negotiation failed. Could not negotiate with the peer about how to
	 * communicate. This is either due to the peer not responding in time, or
	 * it responding in an unexpected way.
	 */
	NegotiationFailed,

	/**
	 * Authentication was rejected. Either the peer rejected our authentication
	 * or we rejected the peers authentication.
	 */
	AuthReject
}
