import { Subscribable } from 'atvik';

import { MessageData } from './MessageData';
import { MessageType } from './MessageType';
import { MessageUnion } from './MessageUnion';
import { Node } from './Node';

/**
 * Groups are a collection of nodes that can be reached in some way. This may
 * either be a full network or a sub-set of one. Groups will emit events when
 * membership changes via {@link onNodeAvailable} and {@link onNodeUnavailable}.
 *
 * Messages sent to nodes in the group can be listened to via {@link onMessage}
 * and broadcasts can be sent via {@link broadcast}.
 *
 * ```javascript
 * const group = ...;
 *
 * // Listen to messages
 * group.onMessage(message => ...);
 *
 * // Join the group
 * await group.join();
 *
 * // Leave the group
 * await group.leave();
 * ```
 */
export interface Group<MessageTypes extends object = any> {
	/**
	 * Name of this group, useful for debugging purposes.
	 */
	readonly name: string;

	/**
	 * Event emitted when a new node joins this group.
	 */
	readonly onNodeAvailable: Subscribable<this, [ node: Node<MessageTypes> ]>;

	/**
	 * Event emitted when a node leaves this group.
	 */
	readonly onNodeUnavailable: Subscribable<this, [ node: Node<MessageTypes> ]>;

	/**
	 * Event emitted when a message is received on this group.
	 */
	readonly onMessage: Subscribable<this, [ message: MessageUnion<MessageTypes> ]>;

	/**
	 * Get all of the nodes that are part of this group.
	 */
	readonly nodes: ReadonlyArray<Node>;

	/**
	 * Broadcast a message to all nodes that have joined this group.
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
	 * Join this group.
	 */
	join(): Promise<void>;

	/**
	 * Leave this group.
	 */
	leave(): Promise<void>;
}
