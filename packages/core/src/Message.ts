import { MessageData } from './MessageData.js';
import { MessageType } from './MessageType.js';
import { Node } from './Node.js';

/**
 * Message received over a network.
 *
 * @typeParam MessageTypes -
 *   definition of types
 * @typeParam T -
 *   keys that are valid, generated via `MessageTypes`
 */
export interface Message<MessageTypes extends object = any, T extends MessageType<MessageTypes> = keyof MessageTypes & string> {
	/**
	 * The source of the message.
	 */
	readonly source: Node<MessageTypes>;

	/**
	 * The type of the message.
	 */
	readonly type: T;

	/**
	 * The data of the message.
	 */
	readonly data: MessageData<MessageTypes, T>;
}
