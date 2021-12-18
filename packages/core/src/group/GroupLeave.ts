/**
 * Message sent when a node no longer wishes to be part of an group.
 */
export interface GroupLeave {
	/**
	 * Group to leave.
	 */
	id: string;

	/**
	 * Version of the group membership.
	 */
	version: number;
}
