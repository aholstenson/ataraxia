import { INode } from '@tyriar/fibonacci-heap';

import { encodeId, Peer, NodeRoutingDetails } from 'ataraxia-transport';

import { IdSet } from '../id';

import { Topology } from './Topology';

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

	/**
	 * Identifier of the node.
	 */
	public readonly id: ArrayBuffer;

	/**
	 * Outgoing connections from this node.
	 */
	public readonly outgoing: TopologyEdge[];
	/**
	 * Incoming connections from this node.
	 */
	public readonly incoming: TopologyEdge[];

	/**
	 * Peer used to reach this node.
	 */
	public peer?: Peer;

	/**
	 * The cost for reaching this node.
	 */
	public searchCost: number;
	public searchPrevious?: TopologyNode;
	public searchNode?: INode<number, TopologyNode>;

	/**
	 * If this node is directly reachable. Directly reachable nodes are ones
	 * where a peer will not perform routing for us.
	 */
	public direct: boolean;

	/**
	 * Version of routing for this node.
	 */
	public version: number;
	/**
	 * Information about all the peers this is reachable via.
	 */
	private reachableVia: IdSet;
	/**
	 * Flag used to help with events when routing is refreshed.
	 */
	public previousReachable: boolean;

	public constructor(parent: Topology, id: ArrayBuffer) {
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

	public get hasPeers() {
		return this.reachableVia.size > 0;
	}

	/**
	 * Update the routing of this node from an incoming node details.
	 *
	 * @param peer -
	 *   peer these details belong to
	 * @param details -
	 *   routing details
	 * @returns
	 *   `true` if details where changed
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

	/**
	 * Remove incoming routing from a peer, indicate that the given peer can no
	 * longer reach this node.
	 *
	 * @param peer -
	 *   peer
	 * @returns
	 *   `true` if routing was actually updated
	 */
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

	/**
	 * Turns this node into a routing details object.
	 *
	 * @returns
	 *   details object
	 */
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

	/**
	 * Update information about what peers we are connected to.
	 *
	 * @param peers -
	 *   peers connected to
	 */
	public updateSelf(peers: Peer[]) {
		this.version++;

		// Empty the array and collect the new edges
		this.clearOutgoingEdges();

		for(const peer of peers) {
			this.addOutgoingEdge(peer.latency, this.parent.getOrCreate(peer.id));
		}
	}

	/**
	 * Update the latency we have to our peers.
	 *
	 * @param peers -
	 *   peers connected to
	 */
	public updateSelfLatencies(peers: Peer[]) {
		// Empty the array and collect the new edges
		this.clearOutgoingEdges();

		for(const peer of peers) {
			this.addOutgoingEdge(peer.latency, this.parent.getOrCreate(peer.id));
		}
	}

	/**
	 * Clear all of the outgoing edges.
	 */
	protected clearOutgoingEdges() {
		for(const edge of this.outgoing) {
			const idx = edge.target.incoming.findIndex(e => e.source === this);
			if(idx >= 0) {
				edge.target.incoming.splice(idx, 1);
			}
		}

		this.outgoing.splice(0, this.outgoing.length);
	}

	/**
	 * Add a new outgoing edge.
	 *
	 * @param cost -
	 *   cost to reach the edge,
	 * @param target -
	 *   node at which the edge points
	 */
	protected addOutgoingEdge(cost: number, target: TopologyNode) {
		const edge: TopologyEdge = {
			source: this,
			cost: cost,
			target: target
		};

		this.outgoing.push(edge);
		target.incoming.push(edge);
	}

	/**
	 * Get debug information about nodes reachable from this node.
	 *
	 * @returns
	 *   array with identifiers of reachable nodes
	 */
	public get outgoingDebug() {
		return this.outgoing.map(e => encodeId(e.target.id));
	}

	/**
	 * Get debug information about which nodes can reach this node.
	 *
	 * @returns
	 *   array with identifies of nodes that can reach this node
	 */
	public get reachableDebug() {
		return Array.from(this.reachableVia.values()).map(e => encodeId(e));
	}

	/**
	 * Get the path used to reach this node from our own network.
	 *
	 * @returns
	 *   array with path used to reach this node
	 */
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

