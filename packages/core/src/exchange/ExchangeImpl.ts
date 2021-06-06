import { Event } from 'atvik';

import { Message } from '../Message';
import { MessageData } from '../MessageData';
import { MessageType } from '../MessageType';
import { MessageUnion } from '../MessageUnion';
import { Node } from '../Node';

import { Exchange } from './Exchange';
import { SharedExchange } from './SharedExchange';

export class ExchangeImpl<MessageTypes extends object> implements Exchange<MessageTypes> {
	/**
	 * Initializer used to fetch an exchange.
	 */
	private initializer: () => SharedExchange;

	/**
	 * The current shared instance.
	 */
	private shared?: SharedExchange;

	/**
	 * Event emitted whenever a node joins this exchange.
	 */
	private readonly nodeAvailableEvent: Event<this, [ Node<MessageTypes> ]>;

	/**
	 * Event emitted whenever a node leaves this exchange.
	 */
	private readonly nodeUnavailableEvent: Event<this, [ Node<MessageTypes> ]>;

	/**
	 * Event emitted whenever a message is received for this exchange.
	 */
	private readonly messageEvent: Event<this, [ MessageUnion<MessageTypes> ]>;

	public constructor(initializer: () => SharedExchange) {
		this.initializer = initializer;

		this.nodeAvailableEvent = new Event(this);
		this.nodeUnavailableEvent = new Event(this);
		this.messageEvent = new Event(this);
	}

	public handleNodeAvailable(node: Node) {
		this.nodeAvailableEvent.emit(node);
	}

	public handleNodeUnavailable(node: Node) {
		this.nodeUnavailableEvent.emit(node);
	}

	public handleMessage(message: Message) {
		this.messageEvent.emit(message as MessageUnion<MessageTypes>);
	}

	public get onNodeAvailable() {
		return this.nodeAvailableEvent.subscribable;
	}

	public get onNodeUnavailable() {
		return this.nodeUnavailableEvent.subscribable;
	}

	public get onMessage() {
		return this.messageEvent.subscribable;
	}

	public broadcast<T extends MessageType<MessageTypes>>(type: T, payload: MessageData<MessageTypes, T>): Promise<void> {
		return this.shared?.broadcast(type, payload) ?? Promise.resolve();
	}

	public join(): Promise<void> {
		if(this.shared) return Promise.resolve();

		this.shared = this.initializer();
		return this.shared.join(this);
	}

	public leave(): Promise<void> {
		if(! this.shared) return Promise.resolve();

		const shared = this.shared;
		this.shared = undefined;
		return shared.leave(this);
	}
}
