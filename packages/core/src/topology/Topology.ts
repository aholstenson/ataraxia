import debug from 'debug';
import { Event, SubscriptionHandle } from 'atvik';

import { IdMap, IdSet, encodeId, sameId } from '../id';

import { TopologyNode } from './TopologyNode';
import {
	Peer,
	NodeRoutingSummary,
	NodeSummaryMessage,
	PeerMessageType,
	NodeRequestMessage,
	NodeDetailsMessage,
	NodeRoutingDetails
} from '../transport';

import { WithNetwork } from '../WithNetwork';
import { Routing } from './Routing';
import { Messaging } from './Messaging';

/**
 * Internal details kept for a peer.
 */
interface PeerDetails {
	/**
	 * The peer instance.
	 */
	peer: Peer;

	/**
	 * Event subscriptions that should be unregistered when peer is no longer
	 * available.
	 */
	subscriptions: SubscriptionHandle[];

	/**
	 * The nodes this peer currently sees.
	 */
	nodes: IdSet;
}

/**
 * Options for a topology instance.
 */
export interface TopologyOptions {
	/**
	 * If the current node should be considered an endpoint. Endpoints do not
	 * perform routing.
	 */
	endpoint?: boolean;
}

/**
 * Information about the topology of the network.
 *
 * This class is responsible for managing the routing within the partially
 * connected mesh network. The routing uses ideas from Shortest Path Bridging,
 * in that it picks the route that it believes to be the shortest one.
 *
 * It does this by creating a graph of the nodes using information the
 * connected peers. To find where to a send a message the graph is then queried
 * about the shortest path between this node and the target node.
 */
// TODO: Gossip about updated peer latencies
export class Topology {
	private readonly parent: WithNetwork;
	private readonly debug: debug.Debugger;

	private readonly endpoint: boolean;

	private readonly availableEvent: Event<this, [ TopologyNode ]>;
	private readonly unavailableEvent: Event<this, [ TopologyNode ]>;
	private readonly dataEvent: Event<this, [ ArrayBuffer, string, ArrayBuffer ]>;

	private readonly self: TopologyNode;
	private readonly nodes: IdMap<TopologyNode>;
	private readonly peers: IdMap<PeerDetails>;

	private readonly routing: Routing;
	private readonly messaging: Messaging;

	private latencyGossipHandle: any;

	/**
	 * Timeout handle if a broadcast is currently queued.
	 */
	private broadcastTimeout: Promise<void> | null;

	/**
	 * Create a new topology for the given network.
	 */
	constructor(parent: WithNetwork, options: TopologyOptions) {
		this.parent = parent;
		this.endpoint = options.endpoint || false;
		this.broadcastTimeout =  null;

		this.nodes = new IdMap();
		this.peers = new IdMap();

		this.availableEvent = new Event(this);
		this.unavailableEvent = new Event(this);
		this.dataEvent = new Event(this);

		this.debug = debug(parent.debugNamespace + ':topology');

		this.self = new TopologyNode(this, parent.networkId);
		this.self.direct = true;
		this.nodes.set(parent.networkId, this.self);

		this.routing = new Routing(this.debug.namespace,
			this.self,
			this.nodes,
			(id) => {
				const d = this.peers.get(id);
				return d ? d.peer : undefined;
			},
			this.availableEvent,
			this.unavailableEvent
		);

		this.messaging = new Messaging(
			this.debug.namespace,
			this.routing,
			this.dataEvent
		);
	}

	/**
	 * Start this topology.
	 */
	public async start(): Promise<void> {
		this.latencyGossipHandle = setTimeout(() => {
			this.latencyGossipHandle = setInterval(() => this.gossipLatencies(), 30000);
		}, 2 + Math.random() * 100);
	}

	/**
	 * Stop this topology.
	 */
	public async stop(): Promise<void> {
		clearTimeout(this.latencyGossipHandle);
		clearInterval(this.latencyGossipHandle);
	}

	get onAvailable() {
		return this.availableEvent.subscribable;
	}

	get onUnavailable() {
		return this.unavailableEvent.subscribable;
	}

	get onData() {
		return this.dataEvent.subscribable;
	}

	/**
	 * Get a specific node, optionally creating it if it is unknown.
	 *
	 */
	public getOrCreate(id: ArrayBuffer): TopologyNode {
		let node = this.nodes.get(id);
		if(! node) {
			node = new TopologyNode(this, id);
			this.nodes.set(id, node);
		}

		return node;
	}

	/**
	 * Get an iterable containing all the nodes that are known.
	 */
	get nodelist() {
		return this.nodes.values();
	}

	/**
	 * Add a peer to this topology. Will start listening for node information,
	 * messages and disconnects. This also starts the discovery process.
	 */
	public addPeer(peer: Peer) {
		const current = this.peers.get(peer.id);
		if(current) {
			/*
			 * We already know about a peer with this identifier.
			 *
			 * 1) It is either the same peer again
			 * 2) Or it's a new peer with the same id
			 *
			 * Both cases are currently ignored as the current peer is still
			 * connected.
			 */
			return;
		}

		if(this.debug.enabled) {
			this.debug('Peer', encodeId(peer.id), 'has connected');
		}

		const peerInfo = {
			peer: peer,

			subscriptions: [
				peer.onData((type, payload) => {
					switch(type) {
						case PeerMessageType.NodeSummary:
							this.handleNodeSummaryMessage(peer, payload);
							break;
						case PeerMessageType.NodeDetails:
							this.handleNodeDetailsMessage(peer, payload);
							break;
						case PeerMessageType.NodeRequest:
							this.handleNodeRequestMessage(peer, payload);
							break;

						case PeerMessageType.Data:
							this.messaging.handleData(peer, payload);
							break;
						case PeerMessageType.DataAck:
							this.messaging.handleAck(payload);
							break;
						case PeerMessageType.DataReject:
							this.messaging.handleReject(payload);
							break;
					}
				}),

				peer.onDisconnect(() => {
					this.handleDisconnect(peer);
				})
			],

			nodes: new IdSet()
		};

		// Create or update the node
		this.peers.set(peer.id, peerInfo);

		// Create or get the node and mark it as reachable
		const node = this.getOrCreate(peer.id);
		node.direct = true;

		// Update our internal routing
		this.self.updateSelf(Array.from(this.peers.values()).map(info => info.peer));

		// Queue a broadcast of routing information
		this.updateRouting(true);
	}

	/**
	 * Handle a summary message from another peer. This will look through
	 * and compare our current node data and send requests for anything where
	 * our version is too low.
	 */
	private handleNodeSummaryMessage(peer: Peer, message: NodeSummaryMessage) {
		if(this.debug.enabled) {
			this.debug(
				'Incoming NodeSummary from', encodeId(peer.id),
				'version=', message.ownVersion,
				', nodes=', message.nodes.map(n => encodeId(n.id) + ' ' + n.version)
			);
		}

		const idsToRequest: ArrayBuffer[] = [];
		const found = new IdSet();
		found.add(peer.id);

		const peerNode = this.getOrCreate(peer.id);
		if(peerNode.version < message.ownVersion) {
			// The routing for the peer has updated
			idsToRequest.push(peerNode.id);
		}

		for(const summary of message.nodes) {
			const node = this.getOrCreate(summary.id);
			found.add(summary.id);

			if(node.version < summary.version) {
				// This node is old, request more data for it
				idsToRequest.push(summary.id);
			}
		}

		// Go through all of the nodes and remove this peer from them
		let didChangeRouting = false;
		for(const node of this.nodelist) {
			if(node !== this.self && ! found.has(node.id) && ! this.peers.get(node.id)) {
				this.debug('Removing from', encodeId(node.id));
				if(node.removeRouting(peer)) {
					didChangeRouting = true;
				}
			}
		}

		if(didChangeRouting) {
			this.updateRouting(true);
		}

		this.debug('Requesting additional info for', idsToRequest.map(encodeId));

		if(idsToRequest.length === 0) {
			// All up to date, no need to request anything
			return;
		}

		// Send the request to the peer
		peer.send(PeerMessageType.NodeRequest, {
			nodes: idsToRequest
		})
			.catch(err => this.debug('Caught error while sending node request', err));
	}

	private handleNodeRequestMessage(peer: Peer, message: NodeRequestMessage) {
		const reply: NodeRoutingDetails[] = [];
		for(const id of message.nodes) {
			const node = this.nodes.get(id);
			if(! node) continue;

			reply.push(node.toRoutingDetails());
		}

		peer.send(PeerMessageType.NodeDetails, {
			nodes: reply
		})
			.catch(err => this.debug('Caught error while sending node details', err));
	}

	private handleNodeDetailsMessage(peer: Peer, message: NodeDetailsMessage) {
		const peerInfo = this.peers.get(peer.id);
		if(! peerInfo) return;

		if(this.debug.enabled) {
			this.debug('NodeDetails from', encodeId(peer.id));
			for(const node of message.nodes) {
				this.debug(encodeId(node.id), 'version=', node.version, 'neighbors=', node.neighbors.map(n => encodeId(n.id)));
			}
			this.debug('End NodeDetails');
		}

		let didChangeRouting = false;
		for(const routing of message.nodes) {
			const node = this.getOrCreate(routing.id);

			// Protect against updating our own routing information
			if(node === this.self) continue;

			if(node.updateRouting(peer, routing)) {
				didChangeRouting = true;
			}
		}

		// Broadcast routing if changed
		this.updateRouting(didChangeRouting);
	}

	/**
	 * Handle that a peer has disconnected. Will update all nodes to indicate
	 * that they can not be reached through the peer anymore.
	 */
	private handleDisconnect(peer: Peer) {
		const info = this.peers.get(peer.id);
		if(! info) return;

		if(this.debug.enabled) {
			this.debug('Peer', encodeId(peer.id), 'has disconnected');
		}

		// Remove the peer and its subscriptions
		this.peers.delete(peer.id);
		for(const handle of info.subscriptions) {
			handle.unsubscribe();
		}

		// Update the node and indicate that it's not directly connectable anymore
		const peerNode = this.getOrCreate(peer.id);
		peerNode.direct = false;

		for(const id of info.nodes.values()) {
			const node = this.nodes.get(id);
			if(! node) continue;

			node.removeRouting(peer);
		}

		// Update our internal routing
		this.self.updateSelf(Array.from(this.peers.values()).map(i => i.peer));

		// Broadcast routing as a disconnect changes our version
		this.updateRouting(true);
	}

	/**
	 * Send data to a given node.
	 *
	 * @param target
	 * @param data
	 */
	public sendData(target: ArrayBuffer, type: string, data: ArrayBuffer): Promise<void> {
		return this.messaging.send(target, type, data);
	}

	/**
	 * Pick a random peer and send information about current latencies to it.
	 */
	private gossipLatencies() {
		if(this.peers.size() === 0) return;

		// Update the latencies from our own peers
		const peers = Array.from(this.peers.values()).map(info => info.peer);
		this.self.updateSelfLatencies(peers);

		// Pick a peer to send information to
		const peer = peers[Math.floor(Math.random() * peers.length)];

		// Build latency information for all nodes
		const routingDetails: NodeRoutingDetails[] = [];
		for(const node of this.nodes.values()) {
			if(node === this.self || sameId(node.id, peer.id)) continue;

			routingDetails.push(node.toRoutingDetails());
		}

		// Only send message if there is anything to send
		if(routingDetails.length === 0) {
			this.debug('Skipped gossiping about latencies');
			return;
		}

		if(this.debug.enabled) {
			this.debug('Gossiping about latencies to', encodeId(peer.id));
		}

		// Send the message
		peer.send(PeerMessageType.NodeDetails, {
			nodes: routingDetails
		})
			.catch(err => this.debug('Caught error while sending node latencies', err));
	}

	/**
	 * Queue that we should broadcast information about our nodes to our
	 * peers.
	 */
	private updateRouting(broadcast: boolean) {
		// Mark the routing as dirty
		this.routing.markDirty();

		// No need to do anything if broadcasting isn't requested
		if(! broadcast) return;

		// Endpoints do not perform routing, never broadcast routing info
		if(this.endpoint) return;

		// Check if there is a pending broadcast
		if(this.broadcastTimeout || this.peers.size() === 0) return;

		this.broadcastTimeout = new Promise((resolve) => setTimeout(() => {
			this.routing.refresh();

			if(this.debug.enabled) {
				this.debug('Broadcasting routing to all connected peers');
				this.debug('Version:', this.self.version);
				this.debug('Peers:', Array.from(this.peers.values()).map(info => encodeId(info.peer.id)).join(', '));

				this.debug('Nodes:');
				for(const node of this.nodes.values()) {
					this.debug(' ', encodeId(node.id), 'version=', node.version, 'outgoing=', node.outgoingDebug, 'reachableVia=', node.reachableDebug);
				}

				this.debug('End broadcasting details');
			}

			const nodes: NodeRoutingSummary[] = [];
			for(const node of this.nodes.values()) {
				if(node === this.self) continue;

				if(node.hasPeers) {
					nodes.push({
						id: node.id,
						version: node.version
					});
				}
			}

			const message: NodeSummaryMessage = {
				ownVersion: this.self.version,
				nodes: nodes
			};

			for(const peerInfo of this.peers.values()) {
				peerInfo.peer.send(PeerMessageType.NodeSummary, message)
					.catch(err => this.debug('Caught error while sending node summary', err));
			}

			this.broadcastTimeout = null;

			resolve();
		}, 100));
	}

	public refreshRouting() {
		this.routing.refresh();
	}

	/**
	 * Get if any actions are pending for this topology. Used during testing
	 * to figure out if its safe to check the results.
	 */
	public get pendingActions(): boolean {
		return this.broadcastTimeout !== null;
	}

	/**
	 * Get a promise that will resolve when all pending actions have been done.
	 */
	public async consolidate() {
		await this.broadcastTimeout;
	}
}
