import debug from 'debug';

import { Message } from '../Message';
import { Network } from '../Network';
import { Node } from '../Node';

import { ExchangeImpl } from './ExchangeImpl';
import { ExchangeMessages } from './ExchangeMessages';

/**
 * Shared information about an exchange.
 */
export class SharedExchange {
	/**
	 * Network instance.
	 */
	private readonly net: Network<ExchangeMessages>;

	/**
	 * Debugger for log messages.
	 */
	public readonly debug: debug.Debugger;

	/**
	 * Identifier of this exchange.
	 */
	public readonly id: string;

	/**
	 * Nodes that have joined this exchange.
	 */
	public readonly nodes: Map<string, Node>;

	/**
	 * All the active instances of this exchange.
	 */
	private readonly instances: Set<ExchangeImpl<any>>;

	/**
	 * Callback used to tell the parent Exchanges if this exchange has any
	 * active instances.
	 */
	private readonly activeCallback: (active: boolean) => Promise<void>;

	public constructor(
		net: Network<ExchangeMessages>,
		id: string,
		activeCallback: (active: boolean) => Promise<void>
	) {
		this.net = net;
		this.id = id;
		this.activeCallback = activeCallback;

		this.nodes = new Map();

		this.debug = debug('ataraxia:' + net.networkName + ':exchange:' + id);

		this.instances = new Set();
	}

	/**
	 * Get if this exchange is currently joined by this node.
	 *
	 * @returns
	 */
	public isJoined() {
		return this.instances.size > 0;
	}

	/**
	 * Check if a certain node is a member of this exchange.
	 *
	 * @param node
	 * @returns
	 */
	public isMember(node: Node) {
		return this.nodes.has(node.id);
	}

	/**
	 * Get if this exchange has any members, local or remote.
	 */
	public hasMembers() {
		return this.nodes.size > 0 || this.instances.size > 0;
	}

	/**
	 * Handle that a new node is joining this exchange.
	 */
	public handleNodeJoin(node: Node) {
		// Check that this is actually a new node
		if(this.nodes.has(node.id)) return;

		this.nodes.set(node.id, node);

		for(const instance of this.instances) {
			instance.handleNodeAvailable(node);
		}
	}

	/**
	 * Handle that a node may be leaving this exchange.
	 *
	 * @param node
	 * @returns
	 */
	public handleNodeLeave(node: Node) {
		if(! this.nodes.has(node.id)) return;

		this.nodes.delete(node.id);

		for(const instance of this.instances) {
			instance.handleNodeUnavailable(node);
		}
	}

	public handleMessage(message: Message) {
		if(! this.nodes.has(message.source.id)) return;

		for(const instance of this.instances) {
			instance.handleMessage(message);
		}
	}

	/**
	 * Broadcast a message to all nodes that have joined this exchange.
	 *
	 * @param type
	 *   the type of message to send
	 * @param payload
	 *   the payload of the message
	 */
	public broadcast(type: string, payload: any): Promise<void> {
		const promises: Promise<void>[] = [];

		// Send to all nodes that have joined the exchange
		for(const node of this.nodes.values()) {
			promises.push(node.send(type, payload)
				.catch(ex => {
					this.debug('Could not broadcast to ' + node.id, ex);
				}));
		}

		return Promise.all(promises)
			.then(() => undefined);
	}

	public async join(instance: ExchangeImpl<any>): Promise<void> {
		this.instances.add(instance);

		if(this.instances.size === 1) {
			// First active instance - tell others about us
			await this.activeCallback(true);
		}
	}

	/**
	 * Leave this exchange, sending a message to all current nodes that we
	 * are leaving.
	 */
	public async leave(instance: ExchangeImpl<any>): Promise<void> {
		this.instances.delete(instance);

		if(this.instances.size === 0) {
			await this.activeCallback(false);
		}
	}
}
