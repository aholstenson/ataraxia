import debugFactory from 'debug';
import { Event } from 'atvik';

import { FibonacciHeap } from '@tyriar/fibonacci-heap';

import { IdMap, encodeId } from '../id';
import { Peer } from '../transport';

import { TopologyNode } from './TopologyNode';

/**
 * Abstraction to help with finding the best route for a packet.
 */
export class Routing {
	public readonly debug: debug.Debugger;
	public readonly self: TopologyNode;
	private readonly nodes: IdMap<TopologyNode>;
	private readonly peers: (id: ArrayBuffer) => Peer | undefined;

	private readonly availableEvent: Event<any, [ TopologyNode ]>;
	private readonly unavailableEvent: Event<any, [ TopologyNode ]>;

	private dirty: boolean;

	constructor(
		debugNamespace: string,
		self: TopologyNode,
		nodes: IdMap<TopologyNode>,
		peers: (id: ArrayBuffer) => Peer | undefined,
		availableEvent: Event<any, [ TopologyNode ]>,
		unavailableEvent: Event<any, [ TopologyNode ]>

	) {
		this.debug = debugFactory(debugNamespace + ':routing');
		this.self = self;
		this.nodes = nodes;
		this.peers = peers;

		this.availableEvent = availableEvent;
		this.unavailableEvent = unavailableEvent;

		this.dirty = true;
	}

	public getPeer(id: ArrayBuffer) {
		return this.peers(id);
	}

	public markDirty() {
		this.dirty = true;
	}

	public refresh() {
		if(! this.dirty) return;

		this.calculatePaths();
		this.dirty = false;

		for(const node of Array.from(this.nodes.values())) {
			const available = !! node.peer || node === this.self;
			if(available) {
				if(! node.previousReachable) {
					node.previousReachable = true;
					this.availableEvent.emit(node);
				}
			} else {
				this.debug('Not available', encodeId(node.id));
				node.previousReachable = false;
				this.unavailableEvent.emit(node);

				// TODO: Longer delay before removing node?
				this.nodes.delete(node.id);
			}
		}

	}

	public findPeerForTarget(node: ArrayBuffer): Peer | null {
		// Perform a refresh if needed
		this.refresh();

		const n = this.nodes.get(node);
		return n?.peer ?? null;
	}

	/**
	 * Perform a recalculation of the best paths to take to all nodes. This
	 * runs Dijkstra's algorithm to calculate the shortest paths to all nodes.
	 *
	 */
	private calculatePaths() {
		const heap = new FibonacciHeap<number, TopologyNode>();

		for(const node of this.nodes.values()) {
			if(this.self === node) {
				node.searchCost = 0;
			} else {
				node.searchCost = Number.MAX_SAFE_INTEGER;
			}

			node.searchPrevious = undefined;
			node.searchNode = heap.insert(node.searchCost, node);
		}

		while(! heap.isEmpty()) {
			const v = heap.extractMinimum();
			if(! v || ! v.value) throw new Error('Heap returned isEmpty()=false but did not return node');

			const node = v.value;

			for(const edge of node.outgoing) {
				const cost = node.searchCost + edge.cost;
				if(cost < edge.target.searchCost) {
					edge.target.searchCost = cost;
					edge.target.searchPrevious = node;

					if(! edge.target.searchNode) {
						throw new Error('Node not inserted into heap');
					}

					heap.decreaseKey(edge.target.searchNode, cost);
				}
			}
		}

		const debug = this.debug.enabled;
		for(const node of this.nodes.values()) {
			node.searchNode = undefined;

			if(node.direct) {
				// Directly reachable, get its peer
				node.peer = this.peers(node.id);

				if(debug) {
					this.debug(encodeId(node.id), 'directly reachable');
				}

				continue;
			} else if(! node.searchPrevious) {
				// This node isn't reachable
				node.peer = undefined;
				node.version = 0;

				if(debug) {
					this.debug(encodeId(node.id), 'not reachable');
				}

				continue;
			}

			let previous: TopologyNode | undefined = node.searchPrevious;
			while(previous && ! previous.direct) {
				previous = previous.searchPrevious;
			}

			if(previous && previous.direct) {
				node.peer = this.peers(previous.id);

				if(debug) {
					this.debug(encodeId(node.id), 'reachable via peer', encodeId(previous.id));
				}
			} else {
				node.peer = undefined;
				node.version = 0;

				if(debug) {
					this.debug(encodeId(node.id), 'not reachable');
				}
			}
		}
	}
}
