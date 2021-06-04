import debug from 'debug';

import { MessageUnion } from '../MessageUnion';
import { Network } from '../Network';
import { Node } from '../Node';

import { Exchange } from './Exchange';
import { SharedExchange } from './SharedExchange';
import { ExchangeMessages } from './ExchangeMessages';
import { ExchangeImpl } from './ExchangeImpl';

/**
 * Manager for all exchange instances that a node is a member of.
 */
export class Exchanges {
	private readonly net: Network<ExchangeMessages>;

	/**
	 * Debugger for log messages.
	 */
	private readonly debug: debug.Debugger;

	private readonly exchanges: Map<string, SharedExchange>;

	constructor(net: Network) {
		this.net = net;

		this.exchanges = new Map();

		this.debug = debug('ataraxia:' + net.networkName + ':exchanges');

		this.net.onMessage(this.handleMessage.bind(this));
		this.net.onNodeAvailable(this.handleNodeAvailable.bind(this));
		this.net.onNodeUnavailable(this.handleNodeUnavailable.bind(this));
	}

	/**
	 * Handle a node becoming available. In this case ask the node to send
	 * us all the exchanges it is a member of.
	 *
	 * @param node
	 */
	 private handleNodeAvailable(node: Node<ExchangeMessages>) {
		node.send('exchange:query', undefined)
			.catch(err => this.debug('Failed to ask node about exchange membership', err));
	}

	/**
	 * Handle a node becoming unavailable. This will remove it from all
	 * exchanges that are currently active.
	 *
	 * @param node
	 */
	private handleNodeUnavailable(node: Node) {
		for(const exchange of this.exchanges.values()) {
			exchange.handleNodeLeave(node);
		}
	}

	private handleMessage(msg: MessageUnion<ExchangeMessages>) {
		switch(msg.type) {
			case 'exchange:join':
				this.handleExchangeJoin(msg.source, msg.data.id);
				break;
			case 'exchange:leave':
				this.handleExchangeLeave(msg.source, msg.data.id);
				break;
			case 'exchange:membership':
				this.handleExchangeMembership(msg.source, msg.data.exchanges);
				break;
			case 'exchange:query':
				this.handleExchangeQuery(msg.source);
				break;
			default:
				// Forward other messages to exchanges
				for(const exchange of this.exchanges.values()) {
					exchange.handleMessage(msg);
				}
				break;
		}
	}

	/**
	 * Handle an incoming request to join an exchange.
	 *
	 * @param node
	 * @param id
	 */
	private handleExchangeJoin(node: Node, id: string) {
		let exchange = this.ensureSharedExchange(id);
		exchange.handleNodeJoin(node);
	}

	/**
	 * Handle an incoming request to leave an exchange.
	 *
	 * @param node
	 * @param id
	 * @returns
	 */
	private handleExchangeLeave(node: Node, id: string) {
		let exchange = this.exchanges.get(id);
		if(! exchange) return;

		// Stop tracking the node as part of the exchange
		exchange.handleNodeLeave(node);

		if(! exchange.hasMembers()) {
			// If the exchange doesn't have any members we drop it
			this.exchanges.delete(id);
		}
	}

	/**
	 * Handle incoming information about all the exchanges a node is a member
	 * of.
	 *
	 * @param node
	 * @param exchanges
	 */
	private handleExchangeMembership(node: Node, exchanges: string[]) {
		const set = new Set(exchanges);
		for(const id of set) {
			// Make sure that we are a member of all the exchanges
			this.ensureSharedExchange(id).handleNodeJoin(node);
		}

		// Go through and remove us from other exchanges
		for(const exchange of this.exchanges.values()) {
			if(set.has(exchange.id)) continue;

			// Stop tracking the node as part of the exchange
			exchange.handleNodeLeave(node);

			if(! exchange.hasMembers()) {
				// If the exchange doesn't have any members we drop it
				this.exchanges.delete(exchange.id);
			}
		}
	}

	/*
	 * Handle a request by another node to tell us about the exchanges we are
	 * a member of.
	 */
	private handleExchangeQuery(node: Node<ExchangeMessages>) {
		// Collect all the exchanges we are a member of
		const memberOf: string[] = [];
		for(const exchange of this.exchanges.values()) {
			if(exchange.isJoined()) {
				memberOf.push(exchange.id);
			}
		}

		node.send('exchange:membership', { exchanges: memberOf });
	}

	public createExchange<MessageTypes extends object = any>(id: string): Exchange<MessageTypes> {
		return new ExchangeImpl<MessageTypes>(() => this.ensureSharedExchange(id));
	}

	private ensureSharedExchange(id: string): SharedExchange {
		let exchange = this.exchanges.get(id);
		if(! exchange) {
			exchange = new SharedExchange(this.net, id, async active => {
				if(active) {
					await this.net.broadcast('exchange:join', { id: id });
				} else {
					await this.net.broadcast('exchange:leave', { id: id });

					// Drop exchange tracking if it doesn't have any members
					const current = this.exchanges.get(id);
					if(! current?.hasMembers()) {
						this.exchanges.delete(id);
					}
				}
			});

			this.exchanges.set(id, exchange);
		}
		return exchange;
	}
}
