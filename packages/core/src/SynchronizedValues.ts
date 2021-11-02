import { Event, Subscribable, SubscriptionHandle } from 'atvik';

import { Debugger } from './Debugger';
import { Group } from './Group';
import { MessageUnion } from './MessageUnion';
import { Node } from './Node';

/**
 * Options for {@link SynchronizedValues}.
 */
export interface SynchronizedValuesOptions<V, P = any> {
	/**
	 * Default value to initialize this node to.
	 */
	defaultValue?: V;

	/**
	 * Apply a patch to the current value. Used to apply incoming patches from
	 * remote nodes.
	 */
	applyPatch?: (currentValue: V | undefined, patch: P) => V;

	/**
	 * Generate a patch which describes changes from the previous version. Will
	 * be sent to remote nodes which then use {@link applyPatch} to apply it.
	 */
	generatePatch?: (currentValue: V, previousVersion: number) => P;
}

/**
 * Shared state between nodes, where each node can set its own value and other
 * nodes will keep track of them.
 *
 * ```javascript
 * const values = new SynchronizedValues(networkOrGroup, 'name-of-value', {
 *   defaultValue: []
 * });
 *
 * state.set([
 *   ...
 * ]);
 * ```
 */
export class SynchronizedValues<V> {
	/**
	 * Debugger for messages and errors.
	 */
	private readonly debug: Debugger<this>;

	/**
	 * Group that this state will propagate to.
	 */
	private readonly group: Group;
	/**
	 * Name of the state variable.
	 */
	private readonly name: string;

	/**
	 * Event used to emit updates.
	 */
	private readonly updateEvent: Event<this, [ node: Node, value: V | undefined ]>;
	/**
	 * Nodes currently being tracked.
	 */
	private readonly nodes: Map<string, NodeState<V>>;

	/**
	 * Handles that will be released when destroyed.
	 */
	private readonly handles: ReadonlyArray<SubscriptionHandle>;

	/**
	 * Increasing version number of the local value. This will increase every
	 * time the local value is set.
	 */
	private localVersion: number;

	/**
	 * Current local value.
	 */
	private localValue?: V;

	/**
	 * Function used to apply a patch to the current value.
	 */
	private applyPatch: (currentValue: V | undefined, patch: any) => V;

	/**
	 * Function used to generate a patch.
	 */
	private generatePatch: (currentValue: V, previousVersion: number) => any;

	public constructor(
		group: Group,
		name: string,
		options?: SynchronizedValuesOptions<V>
	) {
		this.group = group;
		this.name = name;

		this.debug = new Debugger(this, 'ataraxia:' + group.name + ':state:' + name);
		this.nodes = new Map();
		this.updateEvent = new Event(this);

		if(typeof options?.defaultValue !== 'undefined') {
			this.localVersion = 1;
			this.localValue = options.defaultValue;
		} else {
			this.localVersion = 0;
		}

		this.applyPatch = options?.applyPatch ?? ((_, patch) => patch);
		this.generatePatch = options?.generatePatch ?? (currentValue => currentValue);

		const g = group as Group<Message>;
		this.handles = [
			g.onNodeAvailable(this.handleNodeAvailable.bind(this)),
			g.onNodeUnavailable(this.handleNodeUnavailable.bind(this)),
			g.onMessage(this.handleMessage.bind(this))
		];

		// Track the initial nodes
		for(const node of group.nodes) {
			this.handleNodeAvailable(node);
		}
	}

	/**
	 * Destroy this instance. Destroying an instance will stop it from tracking
	 * any more state changes.
	 */
	public destroy(): void {
		for(const handle of this.handles) {
			handle.unsubscribe();
		}

		for(const nodeState of this.nodes.values()) {
			if(nodeState.expiration) {
				clearTimeout(nodeState.expiration);
			}
		}
	}

	/**
	 * Event emitted when the state of a node is updated.
	 *
	 * @returns
	 *   subscribable for event
	 */
	public get onUpdate(): Subscribable<this, [ node: Node, value: V | undefined ]> {
		return this.updateEvent.subscribable;
	}

	/**
	 * Get the value associated with a node.
	 *
	 * @param node -
	 *   node to get value for
	 * @returns
	 *   value if present or `undefined`
	 */
	public get(node: Node): V | undefined {
		const nodeState = this.nodes.get(node.id);
		if(! nodeState || ! nodeState.available) return undefined;

		return nodeState.value;
	}

	/**
	 * Set the current local value. This will try to synchronize it to other
	 * nodes in the current group.
	 *
	 * @param value -
	 *   the local value
	 */
	public setLocal(value: V): void {
		this.localVersion++;
		this.localValue = value;

		for(const node of this.group.nodes) {
			const nodeState = this.nodes.get(node.id);
			if(! nodeState) continue;

			this.sendStatePatch(node, nodeState.knownLocalVersion);
		}
	}

	/**
	 * Update the current value.
	 *
	 * @param func -
	 *   function that will receive the current value and version and should
	 *   generate the new value
	 */
	public updateLocal(func: (currentValue: V | undefined, version: number) => V): void {
		this.setLocal(func(this.localValue, this.localVersion));
	}

	/**
	 * Handle a new node becoming available. In this case we ask them about
	 * all of their state.
	 *
	 * @param node -
	 *   node that is becoming available
	 */
	private handleNodeAvailable(node: Node<Message>): void {
		let nodeState = this.nodes.get(node.id);
		if(! nodeState) {
			// No state for need, initialize
			nodeState = {
				available: true,
				knownLocalVersion: 0,
				version: 0
			};

			this.nodes.set(node.id, nodeState);
		} else {
			// Node has become available before it was removed

			if(nodeState.expiration) {
				// Stop the scheduled removal
				clearTimeout(nodeState.expiration);
				nodeState.expiration = undefined;
			}

			nodeState.available = true;
		}

		// Request anything that has changed from the tracked version
		node.send('sync-value:request', {
			name: this.name,
			lastVersion: nodeState.version
		}).catch(err => this.debug.error(err, 'Failed to ask node', node.id, 'about state:'));
	}

	/**
	 * Handle a node becoming unavailable. Will emit events about its value not
	 * being available and queue it up for removal.
	 *
	 * @param node -
	 *   node that is no longer available
	 */
	private handleNodeUnavailable(node: Node<Message>): void {
		const nodeState = this.nodes.get(node.id);
		if(! nodeState) return;

		const id = node.id;

		// Mark the state as unavailable
		nodeState.available = false;

		// Queue up a removal of the state in 30 seconds
		nodeState.expiration = setTimeout(() => {
			this.nodes.delete(id);
		}, 30000);

		// Emit that the value is gone
		this.updateEvent.emit(node, undefined);
	}

	private handleMessage(message: MessageUnion<Message>): void {
		switch(message.type) {
			case 'sync-value:request':
			{
				/*
				 * State from a certain version onwards has been requested,
				 * keep track of the version we know they have and send back
				 * a patch with full/new data if we have it.
				 */

				// Only handle messages intended for us
				if(message.data.name !== this.name) return;

				// If no node state we don't handle the message
				const nodeState = this.nodes.get(message.source.id);
				if(! nodeState) return;

				const lastVersion = message.data.lastVersion;
				if(lastVersion < this.localVersion) {
					this.sendStatePatch(message.source, lastVersion);
				} else {
					this.debug.log(
						message.source.id, 'requested changes from',
						lastVersion, 'but no changes made - skipping reply'
					);
				}

				break;
			}
			case 'sync-value:patch':
			{
				/**
				 * Incoming patch of data. Merge it and emit new state.
				 */

				// Only handle messages intended for us
				if(message.data.name !== this.name) return;

				// If no node state we don't handle the message
				const nodeState = this.nodes.get(message.source.id);
				if(! nodeState) return;

				const patch = message.data;
				if(patch.baseVersion !== nodeState.version) {
					this.debug.log(
						'Received an update from', message.source.id,
						'with version', patch.baseVersion, 'but currently at',
						nodeState.version, '- patch will be skipped'
					);
					return;
				}

				const value = this.applyPatch(nodeState.value, patch.value);
				nodeState.value = value;
				nodeState.version = patch.version;
				this.updateEvent.emit(message.source, value);

				message.source.send('sync-value:patch-applied', {
					name: this.name,
					version: patch.version,
				}).catch(err => {
					this.debug.error(err, 'Failed to acknowledge patch application to', message.source.id);
				});

				break;
			}
			case 'sync-value:patch-applied':
			{
				// Only handle messages intended for us
				if(message.data.name !== this.name) return;

				// If no node state we don't handle the message
				const nodeState = this.nodes.get(message.source.id);
				if(! nodeState) return;

				const version = message.data.version;
				if(nodeState.knownLocalVersion < version) {
					nodeState.knownLocalVersion = version;
				}

				break;
			}
		}
	}

	/**
	 * Generate and send a patch to a node.
	 *
	 * @param node -
	 *   node the patch is being sent to
	 * @param lastVersion -
	 *   the version to generate a patch from
	 */
	private sendStatePatch(node: Node<Message>, lastVersion: number): void {
		this.debug.log('Sending back changes between', lastVersion, 'and', this.localVersion, 'to', node.id);

		if(typeof this.localValue === 'undefined') return;

		const patch = this.generatePatch(this.localValue, this.localVersion);
		node.send('sync-value:patch', {
			name: this.name,
			baseVersion: lastVersion,
			version: this.localVersion,
			value: patch
		}).catch(err => {
			// Patch could not be sent, log and emit error
			this.debug.error(err, 'Failed to send patch reply to', node.id);
		});
	}
}

interface NodeState<V> {
	/**
	 * If the node is available or not.
	 */
	available: boolean;

	/**
	 * Timer handler used for when this node is being removed.
	 */
	expiration?: NodeJS.Timer;

	/**
	 * The last version of data we broadcasted.
	 */
	knownLocalVersion: number;

	/**
	 * The version of data we have.
	 */
	version: number;

	/**
	 * The current value for the node.
	 */
	value?: V;
}

interface Message {
	'sync-value:request': {
		name: string;
		lastVersion: number;
	};

	'sync-value:patch': PatchMessage;

	'sync-value:patch-applied': {
		name: string;
		version: number;
	};
}

interface PatchMessage {
	name: string;
	baseVersion: number;
	version: number;
	value: any;
}
