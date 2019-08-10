import { Node } from './Node';

/**
 * Message received over a network.
 */
export interface Message {
	/**
	 * The source of the message.
	 */
	source: Node;

	/**
	 * The type of the message.
	 */
	type: string;

	/**
	 * The data of the message.
	 */
	data: any;
}
