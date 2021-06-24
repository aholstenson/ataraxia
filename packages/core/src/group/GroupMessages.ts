import { GroupJoin } from './GroupJoin';
import { GroupLeave } from './GroupLeave';
import { GroupMembership } from './GroupMembership';

/**
 * Types of messages used to keep track of members in groups.
 */
export interface GroupMessages {
	'group:join': GroupJoin;
	'group:leave': GroupLeave;
	'group:membership': GroupMembership;
	'group:query': undefined;
}
