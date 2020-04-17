import { IdSet, encodeId } from '../id';

import { Peer, NodeRoutingDetails } from '../transport';

import { Topology } from './Topology';
import { INode } from '@tyriar/fibonacci-heap';

/**
 * An edge between two nodes.
 */
export interface TopologyEdge {
	/**
	 * The cost to traverse this edge.
	 */
	readonly cost: number;

	/**
	 * Source of the edge.
	 */
	readonly source: TopologyNode;

	/*
	 * Target of the edge.
	 */
	readonly target: TopologyNode;
}

/**
 * Node in the network topology. Nodes are discovered using broadcasts from
 * peers.
 *
 * Reachability to different peers is tracked in the `reachability` array
 * which is sorted so the shortest path is available as the first element.
 */
export class TopologyNode {
	private readonly parent: Topology;

	public readonly id: ArrayBuffer;

	public readonly outgoing: TopologyEdge[];
	public readonly incoming: TopologyEdge[];

	public peer?: Peer;

	public searchCost: number;
	public searchPrevious?: TopologyNode;
	public searchNode?: INode<number, TopologyNode>;

	public direct: boolean;

	public version: number;
	private reachableVia: IdSet;
	public previousReachable: boolean;

	constructor(parent: Topology, id: ArrayBuffer) {
		this.parent = parent;
		this.id = id;

		this.direct = false;
		this.outgoing = [];
		this.incoming = [];

		this.version = 0;
		this.reachableVia = new IdSet();

		this.searchCost = 0;
		this.previousReachable = false;
	}

	get hasPeers() {
		return this.reachableVia.size > 0;
	}

	/**
	 * Update the routing of this node from an incoming node details.
	 *
	 * @param details
	 */
	public updateRouting(peer: Peer, details: NodeRoutingDetails): boolean {
		// Track that this node is reachable via this peer
		this.reachableVia.add(peer.id);

		// Empty the array and collect the new edges
		this.clearOutgoingEdges();

		for(const routing of details.neighbors) {
			this.addOutgoingEdge(routing.latency, this.parent.getOrCreate(routing.id));
		}

		// Check if we have already managed this version
		if(details.version > this.version) {
			this.version = details.version;
			return true;
		} else {
			return false;
		}
	}

	public removeRouting(peer: Peer): boolean {
		if(! this.reachableVia.has(peer.id)) return false;

		this.reachableVia.delete(peer.id);

		if(! this.direct && this.reachableVia.size === 0) {
			// This node is no longer reachable
			this.version = 0;
			this.clearOutgoingEdges();
		}

		return true;
	}

	public toRoutingDetails(): NodeRoutingDetails {
		return {
			id: this.id,
			version: this.version,
			neighbors: this.outgoing.map(e => ({
				id: e.target.id,
				latency: e.cost
			}))
		};
	}

	public updateSelf(peers: Peer[]) {
		this.version++;

		// Empty the array and collect the new edges
		this.clearOutgoingEdges();

		for(const peer of peers) {
			this.addOutgoingEdge(peer.latency, this.parent.getOrCreate(peer.id));
		}
	}

	public updateSelfLatencies(peers: Peer[]) {
		// Empty the array and collect the new edges
		this.clearOutgoingEdges();

		for(const peer of peers) {
			this.addOutgoingEdge(peer.latency, this.parent.getOrCreate(peer.id));
		}
	}

	protected clearOutgoingEdges() {
		for(const edge of this.outgoing) {
			const idx = edge.target.incoming.findIndex(e => e.source === this);
			if(idx >= 0) {
				edge.target.incoming.splice(idx, 1);
			}
		}

		this.outgoing.splice(0, this.outgoing.length);
	}

	protected addOutgoingEdge(cost: number, target: TopologyNode) {
		const edge: TopologyEdge = {
			source: this,
			cost: cost,
			target: target
		};

		this.outgoing.push(edge);
		target.incoming.push(edge);
	}

	get outgoingDebug() {
		return this.outgoing.map(e => encodeId(e.target.id));
	}

	get reachableDebug() {
		return Array.from(this.reachableVia.values()).map(e => encodeId(e));
	}

	public toPath(): ReadonlyArray<TopologyNode> {
		const result: TopologyNode[] = [];

		let previous: TopologyNode | undefined = this.searchPrevious;
		while(previous) {
			result.push(previous);

			previous = previous.searchPrevious;
		}

		return result.reverse();
	}
}

