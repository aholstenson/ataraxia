/**
 * Message used to request listing of messages.
 */
export interface ServiceListRequestMessage {
	/**
	 * The last version seen for the node that we have seen.
	 */
	lastVersion: number;
}
