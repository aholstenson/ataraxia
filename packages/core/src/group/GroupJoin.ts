/**
 * Message sent when a node wishes to announce it is joining an group.
 */
export interface GroupJoin {
	/**
	 * Identifier of the group being joined.
	 */
	id: string;

	/**
	 * Version of the group membership.
	 */
	version: number;
}
