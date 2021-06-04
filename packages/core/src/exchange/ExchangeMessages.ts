import { ExchangeJoin } from './ExchangeJoin';
import { ExchangeLeave } from './ExchangeLeave';
import { ExchangeMembership } from './ExchangeList';

/**
 * Types of messages used to keep track of members in exchanges.
 */
export interface ExchangeMessages {
	'exchange:join': ExchangeJoin,
	'exchange:leave': ExchangeLeave,
	'exchange:membership': ExchangeMembership,
	'exchange:query': undefined
}
