/**
 * Message with all of the groups a node is currently apart of.
 */
export interface GroupMembership {
	/**
	 * All groups the node is a member of.
	 */
	groups: string[];

	/**
	 * Version of the group membership.
	 */
	version: number;
}
