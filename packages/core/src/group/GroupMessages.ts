import { GroupJoin } from './GroupJoin';
import { GroupLeave } from './GroupLeave';
import { GroupMembership } from './GroupMembership';
import { GroupQuery } from './GroupQuery';

/**
 * Types of messages used to keep track of members in groups.
 */
export interface GroupMessages {
	'at:group:join': GroupJoin;
	'at:group:leave': GroupLeave;
	'at:group:membership': GroupMembership;
	'at:group:query': GroupQuery;
}
