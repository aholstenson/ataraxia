import { GroupJoin } from './GroupJoin.js';
import { GroupLeave } from './GroupLeave.js';
import { GroupMembership } from './GroupMembership.js';
import { GroupQuery } from './GroupQuery.js';

/**
 * Types of messages used to keep track of members in groups.
 */
export interface GroupMessages {
	'at:group:join': GroupJoin;
	'at:group:leave': GroupLeave;
	'at:group:membership': GroupMembership;
	'at:group:query': GroupQuery;
}
