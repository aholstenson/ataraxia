import { Subscribable } from 'atvik';

import { MessageData } from './MessageData';
import { MessageType } from './MessageType';
import { MessageUnion } from './MessageUnion';

/**
 * Node within the network. Nodes are individual instances that you can
 * receive and send messages from/to.
 *
 * Nodes are usually retrieved via a {@link Network} or {@link Group}. When
 * a node becomes available you may opt in to events about the node via
 * subscribable functions such as {@link onMessage} and {@link onUnavailable}.
 *
 * When a node becomes unavailable you should stop listening to events and
 * discard the node.
 *
 * Messages to the specific node may be sent via {@link send}.
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
	readonly onMessage: Subscribable<this, [ message: MessageUnion<MessageTypes> ]>;

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

	/**
	 * Advanced: Estimated latency to the node.
	 */
	readonly estimatedLatency: number;
}
