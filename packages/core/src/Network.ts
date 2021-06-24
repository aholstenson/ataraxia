import { Event } from 'atvik';

import { Transport, generateId, encodeId } from 'ataraxia-transport';

import { Debugger } from './Debugger';
import { Group } from './Group';
import { MessageData } from './MessageData';
import { MessageType } from './MessageType';
import { MessageUnion } from './MessageUnion';
import { NetworkNode } from './NetworkNode';
import { Node } from './Node';
import { Topology } from './topology';

/**
 * Options that can be provided for `Network`.
 */
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
	 * Transports of the network. These transports will be automatically added
	 * and started together with the network.
	 */
	transports?: Transport[];
}

/**
 * Network of nodes. The network is the main class in Ataraxia and uses one or
 * more transports to connect to peers and discover nodes in the network.
 *
 * Networks are required to have a name which represents a short name that
 * describes the network. Transports can use this name to automatically find
 * peers with the same network name.
 *
 * Networks can be joined and left as needed. The same app is encouraged to
 * only join the network once and then share an instance of `Network` as
 * needed.
 *
 * ```javascript
 * const net = new Network({
 *   name: 'name-of-network',
 *
 *   transports: [
 *      new MachineLocalNetwork()
 *   ]
 * });
 *
 * await net.join();
 * ```
 *
 * ## Nodes of the network
 *
 * When a network is joined this instance will start emitting events about
 * what nodes are available on the network. It is recommended to use
 * {@link onNodeAvailable} and {@link onNodeUnavailable} to keep track of what
 * nodes the instance can communicate with.
 *
 * It's possible to iterate over a snapshot of nodes using {@link nodes}.
 *
 * ## Sending and receiving messages
 *
 * Messaging in Ataraxia does not guarantee delivery, messages may or may not
 * reach their intended targets.
 *
 * The {@link onMessage} event can be used to listen to events from any node,
 * which is recommended to do when building something that deals with many
 * nodes. If you're only interested in messages from a single node,
 * {@link Node.onMessage} can be used instead.
 *
 * To send a message to a single node use {@link Node.send}.
 *
 * It is possible to broadcast a message to all the known nodes via
 * {@link broadcast}, but as with regular messages no delivery is guaranteed
 * and large broadcasts are discouraged.
 *
 * ## Groups
 *
 * Groups are a way to create named area of the network that nodes can
 * join and leave as needed. Broadcasting a message on an group will only
 * send it to known members of the groups.
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
 *
 * ## Typing of messages
 *
 * The network and groups can be typed when using TypeScript.
 *
 * The types are defined as an interface with the keys representing the
 * message types tied to the type of message:
 *
 * ```typescript
 * interface EchoMessages {
 *   'namespace:echo': { message: string };
 *   'namespace:echo-reply': { reply: string };
 * }
 * ```
 *
 * An group can then be typed via:
 *
 * ```typescript
 * const group: Group<EchoMessages> = new NamedGroup<EchoMessage>(net, 'echo');
 * ```
 *
 * This will help TypeScript validate messages that are sent:
 *
 * ```typescript
 * // TypeScript will allow this
 * group.broadcast('namespace:echo', { message: 'Test' });
 *
 * // TypeScript will not allow these
 * group.broadcast('namespace:echo', { msg: 'Test' });
 * group.broadcast('namespace:e', { message: 'Test' });
 * ```
 *
 * The same is true for listeners:
 *
 * ```typescript
 * group.onMessage(msg => {
 *   if(msg.type === 'namespace:echo') {
 *      // In here msg.data will be of the type { message: string }
 *      const data = msg.data;
 *      msg.source.send('namespace:echo-reply', { reply: data.message })
 *        .catch(errorHandler);
 *   } else if(msg.type === 'namespace:echo-reply') {
 *     // msg.data will be { reply: string }
 *   } else {
 *      // No message of this type
 *   }
 * });
 * ```
 */
export class Network<MessageTypes extends object = any> implements Group<MessageTypes> {
	/**
	 * Debugger for log messages.
	 */
	private readonly debug: Debugger<this>;

	/**
	 * The identifier this node has when connecting to the network.
	 */
	public readonly networkIdBinary: ArrayBuffer;

	/**
	 * The name of the network.
	 */
	public readonly name: string;

	/**
	 * If this node is connecting to the network as an endpoint.
	 */
	public readonly endpoint: boolean;

	/**
	 * The transports for the network.
	 */
	readonly #transports: Transport[];

	/**
	 * If the network is currently active.
	 */
	#active: boolean;

	/**
	 * The topology of the network.
	 */
	readonly #topology: Topology;

	/**
	 * The nodes of the network.
	 */
	readonly #nodes: Map<string, NetworkNode>;

	private readonly services: Map<any, any>;

	readonly #nodeAvailableEvent: Event<this, [ node: Node<MessageTypes> ]>;
	readonly #nodeUnavailableEvent: Event<this, [ node: Node<MessageTypes> ]>;
	readonly #messageEvent: Event<this, [ message: MessageUnion<MessageTypes> ]>;

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
	 * * `transports` - array of transports that the network should start
	 *
	 * @param options -
	 *   The options of the network.
	 */
	public constructor(options: NetworkOptions) {
		if(! options) {
			throw new Error('Options must be provided');
		}

		if(! options.name) {
			throw new Error('Name of network is required');
		}

		const debugNamespace = 'ataraxia:' + options.name;
		this.debug = new Debugger(this, debugNamespace);

		this.networkIdBinary = generateId();
		this.name = options.name;
		this.endpoint = options.endpoint || false;

		this.#transports = [];
		this.#active = false;

		this.#nodeAvailableEvent = new Event(this);
		this.#nodeUnavailableEvent = new Event(this);
		this.#messageEvent = new Event(this);

		this.#nodes = new Map();

		this.services = new Map();

		// Setup the topology of the network
		this.#topology = new Topology(this, options);

		this.#topology.onAvailable(n => {
			const node = new NetworkNode(debugNamespace, this.#topology, n.id);
			this.#nodes.set(node.id, node);

			this.#nodeAvailableEvent.emit(node as any);
		});

		this.#topology.onUnavailable(n => {
			const encodedId = encodeId(n.id);
			const node = this.#nodes.get(encodedId);
			if(! node) return;

			this.#nodes.delete(encodedId);

			node.emitUnavailable();
			this.#nodeUnavailableEvent.emit(node as any);
		});

		this.#topology.onData((id, type, data) => {
			const encodedId = encodeId(id);
			const node = this.#nodes.get(encodedId);
			if(! node) return;

			const msg = node.emitMessage(type, data);
			this.#messageEvent.emit(msg as any);
		});

		// Add all the transports if given via options
		options.transports?.forEach(t => this.addTransport(t));
	}

	/**
	 * Get a service as a singleton. This is useful for starting a single
	 * instance of shared services.
	 *
	 * @param factory -
	 *   constructor that takes instance of network
	 * @returns
	 *   instance of factory
	 */
	public getService<T>(factory: (new (handle: Network) => T)): T {
		let instance = this.services.get(factory);
		if(instance) return instance;

		instance = new factory(this);
		this.services.set(factory, instance);
		return instance;
	}

	/**
	 * Event emitted when a {@link Node} becomes available.
	 *
	 * @returns
	 *   subscribable function
	 */
	public get onNodeAvailable() {
		return this.#nodeAvailableEvent.subscribable;
	}

	/**
	 * Event emitted when a {@link Node} becomes unavailable.
	 *
	 * @returns
	 *   subscribable function
	 */
	public get onNodeUnavailable() {
		return this.#nodeUnavailableEvent.subscribable;
	}

	/**
	 * Event emitted when a message is received from any node on the network.
	 *
	 * @returns
	 *   subscribable function
	 */
	public get onMessage() {
		return this.#messageEvent.subscribable;
	}

	/**
	 * The identifier this local node has, this is the name other nodes see
	 * us as.
	 *
	 * @returns
	 *   network identifier as string
	 */
	public get networkId() {
		return encodeId(this.networkIdBinary);
	}

	/**
	 * Get a snapshot of nodes that can be currently seen in the network.
	 *
	 * @returns
	 *   array of nodes
	 */
	public get nodes(): Node[] {
		return [ ... this.#nodes.values() ];
	}

	/**
	 * Add a transport to this network. If the network is started the transport
	 * will also be started.
	 *
	 * @param transport -
	 *   instance of transport to add
	 */
	public addTransport(transport: Transport): void {
		if(this.#transports.indexOf(transport) >= 0) {
			return;
		}

		this.#transports.push(transport);

		// Whenever a peer is connected send it to the topology
		transport.onPeerConnect(peer => this.#topology.addPeer(peer));

		if(this.#active) {
			transport.start({
				networkId: this.networkIdBinary,
				networkName: this.name,
				endpoint: this.endpoint,
				debugNamespace: this.debug.namespace
			})
				.catch(ex => {
					this.debug.error(ex, 'Could not start transport:');
				});
		}
	}

	/**
	 * Join the network by starting a server and then looking for peers.
	 *
	 * @returns
	 *   promise that resolves when the network is started, the value will
	 *   represent if the network was actually started or not.
	 */
	public async join(): Promise<void> {
		if(this.#active) return;

		this.debug.log('About to join network as ' + this.networkId);

		const options = {
			networkId: this.networkIdBinary,
			networkName: this.name,
			endpoint: this.endpoint,
			debugNamespace: this.debug.namespace
		};

		this.#active = true;

		// Start the topology
		await this.#topology.start();

		// Start all the transports
		try {
			await Promise.all(this.#transports.map(t => t.start(options)));
		} catch(err) {
			// Stop the topology if an error occurs
			await this.#topology.stop();

			this.#active = false;

			throw err;
		}
	}

	/**
	 * Leave the currently joined network.
	 *
	 * @returns
	 *   promise that resolves when the network is stopped
	 */
	public async leave(): Promise<void> {
		if(! this.#active) return;

		// Stop the topology
		await this.#topology.stop();

		// Stop all the transports
		await Promise.all(this.#transports.map(t => t.stop()));
		this.#active = false;
	}

	/**
	 * Broadcast a message to all nodes.
	 *
	 * @param type -
	 *   the type of message to send
	 * @param data -
	 *   the data of the message
	 * @returns
	 *   promise that resolves when the message has been broadcast to all known
	 *   nodes
	 */
	public broadcast<T extends MessageType<MessageTypes>>(type: T, data: MessageData<MessageTypes, T>): Promise<void> {
		const promises: Promise<void>[] = [];

		// Send to all nodes that have joined the group
		for(const node of this.#nodes.values()) {
			promises.push(node.send(type, data)
				.catch(ex => {
					this.debug.error(ex, 'Could not broadcast to ' + node.id + ':');
				}));
		}

		return Promise.all(promises)
			.then(() => undefined);
	}
}
