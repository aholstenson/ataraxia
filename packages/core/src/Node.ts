import { Subscribable } from 'atvik';

import { MessageData } from './MessageData';
import { MessageType } from './MessageType';
import { MessageUnion } from './MessageUnion';

/**
 * Node as seen by a network.
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
	 * @param type
	 * @param payload
	 */
	send<T extends MessageType<MessageTypes>>(type: T, payload: MessageData<MessageTypes, T>): Promise<void>;
}
