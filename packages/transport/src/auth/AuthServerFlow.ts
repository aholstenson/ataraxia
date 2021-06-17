/**
 * Type of reply to send to the client.
 */
export enum AuthServerReplyType {
	/**
	 * Authentication has been approved.
	 */
	Ok,

	/**
	 * Authentication has been rejected.
	 */
	Reject,

	/**
	 * Additional data to pass to the client.
	 */
	Data
}

/**
 * Reply to send to the client.
 */
export type AuthServerReply = {
	type: AuthServerReplyType.Ok;
} | {
	type: AuthServerReplyType.Reject;
} | {
	type: AuthServerReplyType.Data;

	data: ArrayBuffer;
};

/**
 * Server-side authentication flow. This flow will receive data from the client
 * and is expected to handle this data and generate replies for the client.
 */
export interface AuthServerFlow {
	/**
	 * Receive the initial data from the client.
	 */
	receiveInitial(data: ArrayBuffer): Promise<AuthServerReply>;

	/**
	 * Receive additional data from the client.
	 *
	 * @param data -
	 *   buffer with data
	 */
	receiveData(data: ArrayBuffer): Promise<AuthServerReply>;

	/**
	 * Destroy this flow, releasing any of its resources.
	 */
	destroy(): Promise<void>;
}
