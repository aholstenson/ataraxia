import { Subscribable } from 'atvik';
import { Message } from './Message';

/**
 * Node as seen by a network.
 */
export interface Node {
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
	readonly onMessage: Subscribable<this, [ Message ]>;

	/**
	 * Send a message to this node. This will return a promise that will
	 * complete when the message has initially been sent.
	 *
	 * @param type
	 * @param payload
	 */
	send(type: string, payload: any): Promise<void>;
}
