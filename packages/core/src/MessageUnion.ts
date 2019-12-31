import { Message } from './Message';

/**
 * Type generator for creating a union of Message types. This allows for checks
 * like this:
 *
 * ```
 * if(msg.type === 'type') {
 *   // Type of data will be inferred from type
 *   const data = msg.data;
 * }
 * ```
 */
export type MessageUnion<MessageTypes extends object> = {
	[P in keyof MessageTypes]: P extends string ? Message<MessageTypes, P> : never
}[keyof MessageTypes];
