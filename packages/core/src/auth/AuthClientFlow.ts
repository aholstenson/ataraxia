/**
 * Type of reply to send to the server.
 */
export enum AuthClientReplyType {
	/**
	 * Authentication has been rejected.
	 */
	Reject,

	/**
	 * Additional data to pass to the server.
	 */
	Data
}

/**
 * Reply to send to the server.
 */
export type AuthClientReply = {
	type: AuthClientReplyType.Reject;
} | {
	type: AuthClientReplyType.Data;

	data: ArrayBuffer;
};

/**
 * Authentication flow as seen from the client. This flow has an initial
 * message that is sent to the server being connected to. It will then receive
 * additional data from the server until the server replies either accepts or
 * rejects the authentication attempt.
 */
export interface AuthClientFlow {
	/**
	 * Get the initial message to send to the server.
	 */
	initialMessage(): Promise<ArrayBuffer>;

	/**
	 * Receive additional data from the server. This is used for some flows
	 * that need to negotiate additional things. The reply will be sent to the
	 * server.
	 *
	 * @param data -
	 *   buffer with data
	 */
	receiveData(data: ArrayBuffer): Promise<AuthClientReply>;

	/**
	 * Destroy this flow, releasing any resources it has.
	 */
	destroy(): Promise<void>;
}
