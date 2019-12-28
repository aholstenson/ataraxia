import { Node } from './Node';
import { MessageType } from './MessageType';
import { MessageData } from './MessageData';

/**
 * Message received over a network.
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
