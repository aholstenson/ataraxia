import { Event, SubscriptionHandle, Subscribable } from 'atvik';
import debug from 'debug';

import { Network } from './Network';
import { Node } from './Node';

import { Message } from './Message';
import { MessageUnion } from './MessageUnion';
import { MessageType } from './MessageType';
import { MessageData } from './MessageData';

/**
 * Messages used by an exchange.
 */
interface ExchangeMessages {
	'exchange:join': { id: string };
	'exchange:leave': { id: string };
}

/**
 * Exchange that nodes can join or leave and easily broadcast to.
 *
 * ```javascript
 * const exchange = new Exchange(network, 'exchange-id');
 *
 * // Join the exchange
 * await exchange.join();
 * ```
 *
 * `Exchange` can be scoped to for better type support:
 *
 * ```typescript
 * interface MessageTypes {
 *   'exchange-id:hello': HelloMessage;
 *   'exchange-id:echo': { message: string };
 * }
 *
 * const exchange = new Exchange<MessageTypes>(network, 'exchange-id');
 *
 * // Join the exchange
 * await exchange.join();
 *
 * // Broadcast a message to everyone in the exchange
 * exchange.broadcast('exchange-id:echo', {
 *   message: 'Hello World'
 * });
 * ```
 */
export class Exchange<MessageTypes extends object = any> {
	/**
	 * Debugger for log messages.
	 */
	private readonly debug: debug.Debugger;

	/**
	 * The network this exchange is on top of.
	 */
	private readonly network: Network<ExchangeMessages>;

	/**
	 * Identifier of this exchange.
	 */
	public readonly id: string;

	/**
	 * Nodes that have joined this exchange.
	 */
	public readonly nodes: Map<string, Node<MessageTypes>>;

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

	/**
	 * Subscriptions for listeners.
	 */
	private subscriptions: ReadonlyArray<SubscriptionHandle>;

	constructor(net: Network, id: string) {
		this.id = id;
		this.network = net;

		this.nodes = new Map();

		this.debug = debug('ataraxia:' + net.networkName + ':exchange:' + id);

		this.nodeAvailableEvent = new Event(this);
		this.nodeUnavailableEvent = new Event(this);
		this.messageEvent = new Event(this);

		this.subscriptions = [];
	}

	get onNodeAvailable() {
		return this.nodeAvailableEvent.subscribable;
	}

	get onNodeUnavailable() {
		return this.nodeUnavailableEvent.subscribable;
	}

	get onMessage() {
		return this.messageEvent.subscribable;
	}

	/**
	 * Broadcast a message to all nodes that have joined this exchange.
	 *
	 * @param type
	 *   the type of message to send
	 * @param payload
	 *   the payload of the message
	 */
	public async broadcast<T extends MessageType<MessageTypes>>(type: T, payload: MessageData<MessageTypes, T>): Promise<void> {
		const promises = [];

		// Send to all nodes that have joined the exchange
		for(const node of this.nodes.values()) {
			promises.push(node.send(type, payload));
		}

		// Await the result of the broadcast
		for(const promise of promises) {
			try {
				await promise;
			} catch(ex) {
				this.debug('Could not broadcast to all nodes', ex);
			}
		}
	}

	/**
	 * Join this exchange.
	 */
	public join(): Promise<void> {
		if(this.subscriptions.length > 0) {
			return Promise.resolve();
		}

		const network = this.network;
		this.subscriptions = [
			network.onNodeAvailable(this.handleNodeAvailable.bind(this)),
			network.onNodeUnavailable(this.handleNodeUnavailable.bind(this)),
			network.onMessage(this.handleMessage.bind(this))
		];

		return network.broadcast('exchange:join', {
			id: this.id
		});
	}

	/**
	 * Leave this exchange, sending a message to all current nodes that we
	 * are leaving.
	 */
	public leave(): Promise<void> {
		if(this.subscriptions.length === 0) {
			return Promise.resolve();
		}

		for(const handle of this.subscriptions) {
			handle.unsubscribe();
		}

		this.subscriptions = [];

		return this.network.broadcast('exchange:leave', { id: this.id });
	}

	/**
	 * Handle a node becoming available. Will send a message to it that
	 * @param node
	 */
	private handleNodeAvailable(node: Node<ExchangeMessages>) {
		node.send('exchange:join', { id: this.id })
			.catch(err => this.debug('Failed to ask to join exchange', err));
	}

	private handleNodeUnavailable(node: Node) {
		const hadNode = this.nodes.has(node.id);
		this.nodes.delete(node.id);

		if(hadNode) {
			this.nodeUnavailableEvent.emit(node);
		}
	}

	private handleMessage(message: Message) {
		const source = message.source;
		switch(message.type) {
			case 'exchange:join':
				if(! this.nodes.has(source.id)) {
					const node: Node<MessageTypes> = source as any;

					this.nodes.set(source.id, node);
					this.nodeAvailableEvent.emit(node);

					source.send('exchange:join', { id: this.id })
						.catch(err => this.debug('Failed to ask to join exchange', err));
				}
				break;
			case 'exchange:leave':
				this.handleNodeUnavailable(source);
				break;
			default:
				if(message.type.startsWith(this.id + ':')) {
					this.messageEvent.emit(message as any);
				}
				break;
		}
	}
}
