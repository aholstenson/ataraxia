import debug from 'debug';

import { Message } from '../Message';
import { Node } from '../Node';

import { NamedGroup } from './NamedGroup';

export interface GroupImpl {
	handleNodeAvailable(node: Node): void;

	handleNodeUnavailable(node: Node): void;

	handleMessage(message: Message): void;
}

/**
 * Shared information about an group.
 */
export class SharedGroup {
	/**
	 * Debugger for log messages.
	 */
	public readonly debug: debug.Debugger;

	/**
	 * Identifier of this group.
	 */
	public readonly id: string;

	/**
	 * Nodes that have joined this group.
	 */
	public readonly nodes: Map<string, Node>;

	/**
	 * All the active instances of this group.
	 */
	private readonly instances: Set<GroupImpl>;

	/**
	 * Callback used to tell the parent groups if this group has any
	 * active instances.
	 */
	private readonly activeCallback: (active: boolean) => Promise<void>;

	public constructor(
		networkName: string,
		id: string,
		activeCallback: (active: boolean) => Promise<void>
	) {
		this.id = id;
		this.activeCallback = activeCallback;

		this.nodes = new Map();

		this.debug = debug('ataraxia:' + networkName + ':group:' + id);

		this.instances = new Set();
	}

	/**
	 * Get if this group is currently joined by this node.
	 *
	 * @returns
	 *   `true` if this group is currently joined
	 */
	public isJoined() {
		return this.instances.size > 0;
	}

	/**
	 * Check if a certain node is a member of this group.
	 *
	 * @param node -
	 *   node to check of
	 * @returns
	 *   `true` if node is a member
	 */
	public isMember(node: Node) {
		return this.nodes.has(node.id);
	}

	/**
	 * Get if this group has any members, local or remote.
	 *
	 * @returns
	 *   `true` if any members present
	 */
	public hasMembers() {
		return this.nodes.size > 0 || this.instances.size > 0;
	}

	/**
	 * Handle that a new node is joining this group.
	 *
	 * @param node -
	 *   node that is joining
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
	 * Handle that a node may be leaving this group.
	 *
	 * @param node -
	 *   node that is leaving
	 */
	public handleNodeLeave(node: Node) {
		if(! this.nodes.has(node.id)) return;

		this.nodes.delete(node.id);

		for(const instance of this.instances) {
			instance.handleNodeUnavailable(node);
		}
	}

	/**
	 * Handle an incoming message.
	 *
	 * @param message -
	 *   message instance
	 */
	public handleMessage(message: Message) {
		if(! this.nodes.has(message.source.id)) return;

		for(const instance of this.instances) {
			instance.handleMessage(message);
		}
	}

	/**
	 * Broadcast a message to all nodes that have joined this group.
	 *
	 * @param type -
	 *   the type of message to send
	 * @param payload -
	 *   the payload of the message
	 * @returns
	 *   promise that resolves when nodes have all been broadcast to
	 */
	public broadcast(type: string, payload: any): Promise<void> {
		const promises: Promise<void>[] = [];

		// Send to all nodes that have joined the group
		for(const node of this.nodes.values()) {
			promises.push(node.send(type, payload)
				.catch(ex => {
					this.debug('Could not broadcast to ' + node.id, ex);
				}));
		}

		return Promise.all(promises)
			.then(() => undefined);
	}

	/**
	 * Join a local group instance.
	 *
	 * @param instance -
	 *   instance that is joining
	 */
	public async join(instance: GroupImpl): Promise<void> {
		this.instances.add(instance);

		if(this.instances.size === 1) {
			// First active instance - tell others about us
			await this.activeCallback(true);
		}
	}

	/**
	 * Leave this group, sending a message to all current nodes that we
	 * are leaving.
	 *
	 * @param instance -
	 *   instance that is leaving
	 */
	public async leave(instance: GroupImpl): Promise<void> {
		this.instances.delete(instance);

		if(this.instances.size === 0) {
			await this.activeCallback(false);
		}
	}
}
