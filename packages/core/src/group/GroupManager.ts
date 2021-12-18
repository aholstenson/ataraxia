import debug from 'debug';

import { MessageUnion } from '../MessageUnion';
import { Network } from '../Network';
import { Node } from '../Node';
import { GroupJoin } from './GroupJoin';
import { GroupLeave } from './GroupLeave';
import { GroupMembership } from './GroupMembership';

import { GroupMessages } from './GroupMessages';
import { GroupQuery } from './GroupQuery';
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

	/**
	 * Nodes currently being tracked.
	 */
	private readonly nodes: Map<string, NodeState>;

	private version: number;
	private gossipTimer: any;

	public constructor(net: Network) {
		this.debug = debug('ataraxia:' + net.name + ':groups');

		this.net = net;

		this.groups = new Map();
		this.nodes = new Map();

		this.version = 0;

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
		let nodeState = this.nodes.get(node.id);
		if(! nodeState) {
			// No state for need, initialize
			nodeState = {
				observedVersion: 0
			};

			this.nodes.set(node.id, nodeState);
		}

		// Request group membership
		node.send('at:group:query', {
			version: nodeState.observedVersion
		})
			.catch(err => this.debug('Failed to ask node about group membership', err));

		if(! this.gossipTimer) {
			// Register a timer for requesting group membership from a random
			// node every 15 seconds
			this.gossipTimer = setInterval(this.gossip.bind(this), 15000);
		}
	}

	/**
	 * Handle a node becoming unavailable. This will remove it from all
	 * groups that are currently active.
	 *
	 * @param node -
	 *   node that is no longer available
	 */
	private handleNodeUnavailable(node: Node) {
		const nodeState = this.nodes.get(node.id);
		if(! nodeState) return;

		for(const group of this.groups.values()) {
			group.handleNodeLeave(node);
		}

		this.nodes.delete(node.id);
		if(this.nodes.size === 0) {
			clearInterval(this.gossipTimer);
			this.gossipTimer = undefined;
		}
	}

	private gossip() {
		const nodes = this.net.nodes;
		const idx = Math.floor(Math.random() * nodes.length);
		const node = nodes[idx];

		const nodeState = this.nodes.get(node.id);
		if(! nodeState) return;

		node.send('at:group:query', {
			version: nodeState.observedVersion
		})
			.catch(err => this.debug('Failed to ask node about group membership', err));
	}

	private handleMessage(msg: MessageUnion<GroupMessages>) {
		switch(msg.type) {
			case 'at:group:join':
				this.handleGroupJoin(msg.source, msg.data);
				break;
			case 'at:group:leave':
				this.handleGroupLeave(msg.source, msg.data);
				break;
			case 'at:group:membership':
				this.handleGroupMembership(msg.source, msg.data);
				break;
			case 'at:group:query':
				this.handleGroupQuery(msg.source, msg.data);
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
	 * @param msg -
	 *   message received
	 */
	private handleGroupJoin(node: Node, msg: GroupJoin) {
		const nodeState = this.nodes.get(node.id);
		if(! nodeState) {
			return;
		}

		nodeState.observedVersion = msg.version;
		const group = this.ensureSharedGroup(msg.id);
		group.handleNodeJoin(node);
	}

	/**
	 * Handle an incoming request to leave an group.
	 *
	 * @param node -
	 *   node message comes from
	 * @param msg -
	 *   message describing group being left
	 */
	private handleGroupLeave(node: Node, msg: GroupLeave) {
		const nodeState = this.nodes.get(node.id);
		if(nodeState) {
			nodeState.observedVersion = msg.version;
		}

		const group = this.groups.get(msg.id);
		if(! group) return;

		// Stop tracking the node as part of the group
		group.handleNodeLeave(node);

		if(! group.hasMembers()) {
			// If the group doesn't have any members we drop it
			this.groups.delete(msg.id);
		}
	}

	/**
	 * Handle incoming information about all the groups a node is a member
	 * of.
	 *
	 * @param node -
	 *   node message comes from
	 * @param msg -
	 *   message containing group membership
	 */
	private handleGroupMembership(node: Node, msg: GroupMembership) {
		const nodeState = this.nodes.get(node.id);
		if(! nodeState) {
			return;
		}

		nodeState.observedVersion = msg.version;

		const set = new Set(msg.groups);
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

	/**
	 * Handle a request by another node to tell us about the groups we are
	 * a member of.
	 *
	 * @param node -
	 *   node that requested our membership
	 * @param msg -
	 *   message containing query information
	 */
	private handleGroupQuery(node: Node<GroupMessages>, msg: GroupQuery) {
		if(this.version === msg.version) {
			// Node requested the current version, no need to reply
			return;
		}

		// Collect all the groups we are a member of
		const memberOf: string[] = [];
		for(const group of this.groups.values()) {
			if(group.isJoined()) {
				memberOf.push(group.id);
			}
		}

		node.send('at:group:membership', {
			version: this.version,
			groups: memberOf
		})
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
					this.version++;
					await this.net.broadcast('at:group:join', { id: id, version: this.version });
				} else {
					this.version++;
					await this.net.broadcast('at:group:leave', { id: id, version: this.version });

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

interface NodeState {
	/**
	 * The version of group membership that has been observed.
	 */
	observedVersion: number;
}
