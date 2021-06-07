import { Subscribable } from 'atvik';

import { MessageData } from './MessageData';
import { MessageType } from './MessageType';
import { MessageUnion } from './MessageUnion';

/**
 * Node within the network. Nodes are individual instances that you can
 * exchange messages with.
 */
export interface Node<MessageTypes extends object = any> {
	/**
	 * The identifier of this node.
	 */
	readonly id: string;

	/**
	 * Event emitted when this node is no longer available and should be
	 * discarded.
	 */
	readonly onUnavailable: Subscribable<this>;

	/**
	 * Event emitted when a message is received by this node.
	 */
	readonly onMessage: Subscribable<this, [ MessageUnion<MessageTypes> ]>;

	/**
	 * Send a message to this node. This will return a promise that will
	 * complete when the message has initially been sent.
	 *
	 * @param type -
	 *   the type of message being sent
	 * @param data -
	 *   data being sent
	 */
	send<T extends MessageType<MessageTypes>>(type: T, data: MessageData<MessageTypes, T>): Promise<void>;
}
