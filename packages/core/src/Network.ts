import debug from 'debug';
import { Event } from 'atvik';

import { generateId, encodeId } from './id';
import { Transport } from './transport';

import { Topology } from './topology';

import { Node } from './Node';
import { NetworkNode } from './NetworkNode';

import { Message } from './Message';
import { Authentication, AuthProvider } from './auth';

export interface NetworkOptions {
	/**
	 * The name of the network.
	 */
	name: string;

	/**
	 * If this client should connect to the network as an endpoint. This helps
	 * the network know that this client isn't intended to perform routing
	 * and that a transport may opt to connect to fewer peers.
	 */
	endpoint?: boolean;

	/**
	 * Authentication providers to use. At least one providers needs to be
	 * made available.
	 */
	authentication: AuthProvider[];
}

/**
 * Network of nodes. The network is the main class in Ataraxia and uses one or
 * more transports to connect to peers and discover nodes in the network.
 *
 * Networks are required to have a name which represents a short name that
 * describes the network. Transports can use this name to automatically find
 * peers with the same network name.
 */
export class Network {
	/**
	 * Debugger for log messages.
	 */
	private debug: debug.Debugger;

	/**
	 * The identifier this node has when connecting to the network.
	 */
	public readonly networkIdBinary: ArrayBuffer;

	/**
	 * The name of the network.
	 */
	public readonly networkName: string;

	/**
	 * If this node is connecting to the network as an endpoint.
	 */
	public readonly endpoint: boolean;

	/**
	 * The transports for the network.
	 */
	private readonly transports: Transport[];

	/**
	 * If the network is currently active.
	 */
	private active: boolean;

	/**
	 * The topology of the network.
	 */
	private readonly topology: Topology;

	/**
	 * The nodes of the network.
	 */
	private readonly nodes: Map<string, NetworkNode>;

	/**
	 * Authentication for this network.
	 */
	private readonly authentication: Authentication;

	private readonly nodeAvailableEvent: Event<this, [ Node ]>;
	private readonly nodeUnavailableEvent: Event<this, [ Node ]>;
	private readonly messageEvent: Event<this, [ Message ]>;

	/**
	 * Create a new network. A network must be provided a `name` which is a
	 * short string used that transports may use to discover peers. Such a
	 * short name is usually something like `app-name` or `known-network-name`.
	 *
	 * These options are available:
	 *
	 * * `name` - the name of the network
	 * * `endpoint` - boolean indicating if this instance is an endpoint and
	 *    wants to avoid routing.
	 *
	 * @param {object} options
	 *   The options of the network.
	 */
	constructor(options: NetworkOptions) {
		if(! options) {
			throw new Error('Options must be provided');
		}

		if(! options.name) {
			throw new Error('Name of network is required');
		}

		if(! Array.isArray(options.authentication) || options.authentication.length === 0) {
			throw new Error('At least one authentication provider is required');
		}

		const debugNamespace = 'ataraxia:' + options.name;
		this.debug = debug(debugNamespace);

		this.networkIdBinary = generateId();
		this.networkName = options.name;
		this.endpoint = options.endpoint || false;

		this.transports = [];
		this.active = false;

		this.nodeAvailableEvent = new Event(this);
		this.nodeUnavailableEvent = new Event(this);
		this.messageEvent = new Event(this);

		this.nodes = new Map();

		this.authentication = new Authentication({
			providers: options.authentication
		});

		// Setup the topology of the network
		this.topology = new Topology({
			networkId: this.networkIdBinary,
			debugNamespace: debugNamespace,
			authentication: this.authentication
		}, options);

		this.topology.onAvailable(n => {
			const node = new NetworkNode(this.topology, n.id);
			this.nodes.set(node.id, node);

			this.nodeAvailableEvent.emit(node);
		});

		this.topology.onUnavailable(n => {
			const encodedId = encodeId(n.id);
			const node = this.nodes.get(encodedId);
			if(! node) return;

			this.nodes.delete(encodedId);

			node.emitUnavailable();
			this.nodeUnavailableEvent.emit(node);
		});

		this.topology.onData((id, type, data) => {
			const encodedId = encodeId(id);
			const node = this.nodes.get(encodedId);
			if(! node) return;

			const msg = node.emitMessage(type, data);
			this.messageEvent.emit(msg);
		});
	}

	get onNodeAvailable() {
		return this.nodeAvailableEvent.subscribable;
	}

	get onNodeUnavailable() {
		return this.nodeUnavailableEvent.subscribable;
	}

	get onMessage() {
		return this.messageEvent.subscribable;
	}

	get networkId() {
		return encodeId(this.networkIdBinary);
	}

	/**
	 * Add a transport to this network. If the network is started the transport
	 * will also be started.
	 */
	public addTransport(transport: Transport) {
		if(this.transports.indexOf(transport) >= 0) {
			return;
		}

		this.transports.push(transport);

		// Whenever a peer is connected send it to the topology
		transport.onPeerConnect(peer => this.topology.addPeer(peer));

		if(this.active) {
			transport.start({
				networkId: this.networkIdBinary,
				networkName: this.networkName,
				endpoint: this.endpoint,
				debugNamespace: this.debug.namespace,
				authentication: this.authentication
			});
		}
	}

	/**
	 * Join the network by starting a server and then looking for peers.
	 */
	public async start(): Promise<boolean> {
		if(this.active) return false;

		this.debug('About to join network as ' + this.networkId);

		const options = {
			networkId: this.networkIdBinary,
			networkName: this.networkName,
			endpoint: this.endpoint,
			debugNamespace: this.debug.namespace,
			authentication: this.authentication
		};

		this.active = true;
		try {
			await Promise.all(this.transports.map(t => t.start(options)));
			return true;
		} catch (err) {
			this.active = false;
			throw err;
		}
	}

	/**
	 * Leave the currently joined network.
	 */
	public async stop(): Promise<boolean> {
		if(! this.active) return false;

		await Promise.all(this.transports.map(t => t.stop()));
		this.active = false;
		return true;
	}

	/**
	 * Broadcast a message to all nodes.
	 *
	 * @param type
	 *   the type of message to send
	 * @param payload
	 *   the payload of the message
	 */
	public async broadcast(type: string, payload: any): Promise<void> {
		const promises = [];

		// Send to all connected nodes
		for(const node of this.nodes.values()) {
			promises.push(node.send(type, payload));
		}

		// Await the result of the broadcast
		for(const promise of promises) {
			try {
				await promise;
			} catch(ex) {
				this.debug('Could not broadcast to all nodes', ex);
			}
		}
	}
}
