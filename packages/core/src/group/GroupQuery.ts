/**
 * Message sent to a node to ask it about its members.
 */
export interface GroupQuery {
	/**
	 * Version of the group membership that was last observed.
	 */
	version: number;
}
