import debug from 'debug';

import { MessageUnion } from '../MessageUnion';
import { Network } from '../Network';
import { Node } from '../Node';

import { GroupMessages } from './GroupMessages';
import { SharedGroup } from './SharedGroup';

/**
 * Manager for all group instances that a node is a member of.
 */
export class GroupManager {
	private readonly net: Network<GroupMessages>;

	/**
	 * Debugger for log messages.
	 */
	private readonly debug: debug.Debugger;

	private readonly groups: Map<string, SharedGroup>;

	public constructor(net: Network) {
		this.net = net;

		this.groups = new Map();

		this.debug = debug('ataraxia:' + net.name + ':groups');

		this.net.onMessage(this.handleMessage.bind(this));
		this.net.onNodeAvailable(this.handleNodeAvailable.bind(this));
		this.net.onNodeUnavailable(this.handleNodeUnavailable.bind(this));
	}

	/**
	 * Handle a node becoming available. In this case ask the node to send
	 * us all the groups it is a member of.
	 *
	 * @param node -
	 *   node that is available
	 */
	private handleNodeAvailable(node: Node<GroupMessages>) {
		node.send('at:group:query', undefined)
			.catch(err => this.debug('Failed to ask node about group membership', err));
	}

	/**
	 * Handle a node becoming unavailable. This will remove it from all
	 * groups that are currently active.
	 *
	 * @param node -
	 *   node that is no longer available
	 */
	private handleNodeUnavailable(node: Node) {
		for(const group of this.groups.values()) {
			group.handleNodeLeave(node);
		}
	}

	private handleMessage(msg: MessageUnion<GroupMessages>) {
		switch(msg.type) {
			case 'at:group:join':
				this.handleGroupJoin(msg.source, msg.data.id);
				break;
			case 'at:group:leave':
				this.handleGroupLeave(msg.source, msg.data.id);
				break;
			case 'at:group:membership':
				this.handleGroupMembership(msg.source, msg.data.groups);
				break;
			case 'at:group:query':
				this.handleGroupQuery(msg.source);
				break;
			default:
				// Forward other messages to groups
				for(const group of this.groups.values()) {
					group.handleMessage(msg);
				}
				break;
		}
	}

	/**
	 * Handle an incoming request to join an group.
	 *
	 * @param node -
	 *   node message comes from
	 * @param id -
	 *   id of group being joined
	 */
	private handleGroupJoin(node: Node, id: string) {
		const group = this.ensureSharedGroup(id);
		group.handleNodeJoin(node);
	}

	/**
	 * Handle an incoming request to leave an group.
	 *
	 * @param node -
	 *   node message comes from
	 * @param id -
	 *   group being left
	 */
	private handleGroupLeave(node: Node, id: string) {
		const group = this.groups.get(id);
		if(! group) return;

		// Stop tracking the node as part of the group
		group.handleNodeLeave(node);

		if(! group.hasMembers()) {
			// If the group doesn't have any members we drop it
			this.groups.delete(id);
		}
	}

	/**
	 * Handle incoming information about all the groups a node is a member
	 * of.
	 *
	 * @param node -
	 *   node message comes from
	 * @param groups -
	 *   groups that the node is a member of
	 */
	private handleGroupMembership(node: Node, groups: string[]) {
		const set = new Set(groups);
		for(const id of set) {
			// Make sure that we are a member of all the groups
			this.ensureSharedGroup(id).handleNodeJoin(node);
		}

		// Go through and remove us from other groups
		for(const group of this.groups.values()) {
			if(set.has(group.id)) continue;

			// Stop tracking the node as part of the group
			group.handleNodeLeave(node);

			if(! group.hasMembers()) {
				// If the group doesn't have any members we drop it
				this.groups.delete(group.id);
			}
		}
	}

	/*
	 * Handle a request by another node to tell us about the groups we are
	 * a member of.
	 */
	private handleGroupQuery(node: Node<GroupMessages>) {
		// Collect all the groups we are a member of
		const memberOf: string[] = [];
		for(const group of this.groups.values()) {
			if(group.isJoined()) {
				memberOf.push(group.id);
			}
		}

		node.send('at:group:membership', { groups: memberOf })
			.catch(err => this.debug('Could not send membership reply to', node.id, err));
	}

	public getSharedGroup(id: string): () => SharedGroup {
		return () => this.ensureSharedGroup(id);
	}

	private ensureSharedGroup(id: string): SharedGroup {
		let group = this.groups.get(id);
		if(! group) {
			group = new SharedGroup(this.net.name, id, async active => {
				if(active) {
					await this.net.broadcast('at:group:join', { id: id });
				} else {
					await this.net.broadcast('at:group:leave', { id: id });

					// Drop group tracking if it doesn't have any members
					const current = this.groups.get(id);
					if(! current?.hasMembers()) {
						this.groups.delete(id);
					}
				}
			});

			this.groups.set(id, group);
		}
		return group;
	}
}
