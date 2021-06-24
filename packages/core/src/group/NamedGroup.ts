import { Event } from 'atvik';

import { Group } from '../Group';
import { MessageData } from '../MessageData';
import { MessageType } from '../MessageType';
import { MessageUnion } from '../MessageUnion';
import { Network } from '../Network';
import { Node } from '../Node';

import { GroupManager } from './GroupManager';
import { GroupImpl, SharedGroup } from './SharedGroup';

/**
 * Group with a specific name, lets nodes in the network join and leave as
 * needed.
 *
 * ```typescript
 * const group = new NamedGroup(net, 'name-of-group');
 *
 * // Groups need to be joined
 * await group.join();
 *
 * // Broadcast to the known members
 * await group.broadcast('typeOfMessage', dataOfMessage);
 * ```
 */
export class NamedGroup<MessageTypes extends object> implements Group<MessageTypes> {
	/**
	 * Initializer used to fetch an group.
	 */
	private readonly initializer: () => SharedGroup;

	/**
	 * The current shared instance.
	 */
	private shared?: SharedGroup;

	/**
	 * Get the name of this group in the network. Will be prefixed with the
	 * network name.
	 */
	public readonly name: string;

	/**
	 * Event emitted whenever a node joins this group.
	 */
	private readonly nodeAvailableEvent: Event<this, [ node: Node<MessageTypes> ]>;

	/**
	 * Event emitted whenever a node leaves this group.
	 */
	private readonly nodeUnavailableEvent: Event<this, [ node: Node<MessageTypes> ]>;

	/**
	 * Event emitted whenever a message is received for this group.
	 */
	private readonly messageEvent: Event<this, [ message: MessageUnion<MessageTypes> ]>;

	private readonly handler: GroupImpl;

	public constructor(net: Network, name: string) {
		const manager = net.getService(GroupManager);
		this.initializer = manager.getSharedGroup(name);

		this.name = net.name + ':' + name;

		this.nodeAvailableEvent = new Event(this);
		this.nodeUnavailableEvent = new Event(this);
		this.messageEvent = new Event(this);

		this.handler = {
			handleNodeAvailable: this.nodeAvailableEvent.emit.bind(this.nodeAvailableEvent),
			handleNodeUnavailable: this.nodeUnavailableEvent.emit.bind(this.nodeUnavailableEvent),
			handleMessage: this.messageEvent.emit.bind(this.messageEvent)
		};
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

	public get nodes(): Node[] {
		return [ ...this.initializer().nodes.values() ];
	}

	public broadcast<T extends MessageType<MessageTypes>>(type: T, payload: MessageData<MessageTypes, T>): Promise<void> {
		return this.shared?.broadcast(type, payload) ?? Promise.resolve();
	}

	public join(): Promise<void> {
		if(this.shared) return Promise.resolve();

		this.shared = this.initializer();
		return this.shared.join(this.handler);
	}

	public leave(): Promise<void> {
		if(! this.shared) return Promise.resolve();

		const shared = this.shared;
		this.shared = undefined;
		return shared.leave(this.handler);
	}
}
