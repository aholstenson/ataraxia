import { Subscribable } from 'atvik';

import { MessageData } from '../MessageData';
import { MessageType } from '../MessageType';
import { MessageUnion } from '../MessageUnion';
import { Node } from '../Node';

/**
 * Exchanges are a sub-group of a network that nodes can join, leave and
 * easily broadcast to.
 *
 * ```javascript
 * const exchange = await net.createExchange('exchange-id');
 *
 * // Listen to messages
 * exchange.onMessage(message => ...);
 *
 * // Join the exchange
 * await exchange.join();
 * ```
 *
 * `Exchange` can be scoped for better type support:
 *
 * ```typescript
 * interface MessageTypes {
 *   'test-namespace:hello': HelloMessage;
 *   'test-namespace:text': { message: string };
 * }
 *
 * const exchange = await net.createExchange<MessageTypes>('exchange-id');
 *
 * // Join the exchange
 * await exchange.join();
 *
 * // Broadcast a message to everyone in the exchange
 * await exchange.broadcast('test-namespace:text', {
 *   message: 'Hello World'
 * });
 * ```
 */
export interface Exchange<MessageTypes extends object = any> {

	/**
	 * Event emitted when a new node joins this exchange.
	 */
	readonly onNodeAvailable: Subscribable<this, [ Node<MessageTypes> ]>;

	/**
	 * Event emitted when a node leaves this exchange.
	 */
	readonly onNodeUnavailable: Subscribable<this, [ Node<MessageTypes> ]>;

	/**
	 * Event emitted when a message is received on this exchange.
	 */
	readonly onMessage: Subscribable<this, [ MessageUnion<MessageTypes> ]>;

	/**
	 * Broadcast a message to all nodes that have joined this exchange.
	 *
	 * @param type -
	 *   the type of message to send
	 * @param data -
	 *   the data to send
	 */
	broadcast<T extends MessageType<MessageTypes>>(
		type: T,
		data: MessageData<MessageTypes, T>
	): Promise<void>;

	/**
	 * Join this exchange.
	 */
	join(): Promise<void>;

	/**
	 * Leave this exchange.
	 */
	leave(): Promise<void>;
}
