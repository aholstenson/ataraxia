import { createHash } from 'crypto';
import { Duplex } from 'stream';

import hyperswarm, { Swarm } from 'hyperswarm';

import {
	AbstractTransport,
	AuthProvider,
	TransportOptions
} from 'ataraxia-transport';
import { EncryptedStreamingPeer } from 'ataraxia-transport-streams';

/**
 * Options that can be used for a Hyperswarm transport.
 */
export interface HyperswarmTransportOptions {
	topic: string;

	/**
	 * Authentication providers to use for this transport.
	 */
	authentication: ReadonlyArray<AuthProvider>;
}

/**
 * Hyperswarm based transport. This transport will connect to
 * [Hyperswarm](https://github.com/hyperswarm/hyperswarm) and attempt to find
 * peers that are published under a specific topic. When peers are found they
 * will be connected to, a secure channel established and authentication will
 * occur.
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { HyperswarmTransport } from 'ataraxia-hyperswarm';
 *
 * // Setup a network over Hyperswarm
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transports: [
 *     new HyperswarmTransport({
 *       // Topic used to find peers
 *       topic: 'Unique Topic',
 *       // Setup anonymous authentication
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *   ]
 * });
 *
 * // Join the network
 * await net.join();
 * ```
 */
export class HyperswarmTransport extends AbstractTransport {
	private readonly options: HyperswarmTransportOptions;

	private topic?: Buffer;
	private swarm?: Swarm;

	public constructor(options: HyperswarmTransportOptions) {
		super('hyperswarm');

		this.options = options;
	}

	public async start(options: TransportOptions) {
		const started = await super.start(options);

		if(! started) return false;

		this.swarm = hyperswarm({
			// Assume that endpoints are short-lived
			ephemeral: options.endpoint ? true : undefined
		});

		this.topic = createHash('sha256')
			.update(this.options.topic)
			.digest();

		this.debug('Joining the topic', this.topic.toString('hex'));

		this.swarm.on('connection', (socket, info) => {
			this.debug('Connecting to a peer, client=', info.client);

			this.addPeer(new HyperswarmPeer(
				this.transportOptions,
				this.options.authentication,
				socket,
				info.client
			));
		});

		const swarm = this.swarm;
		const topic = this.topic;
		await new Promise(resolve => {
			/*
			 * Join the topic automatically setting announce and lookup.
			 *
			 * Endpoints join the topic without announcing they can be connected
			 * to which makes them only find existing peers.
			 *
			 * If not an endpoint this will announce its availability and also
			 * search for existing peers.
			 */
			swarm.join(topic, {
				announce: ! options.endpoint,
				lookup: true
			}, () => resolve(undefined));
		});

		this.debug('Swarm has been joined');

		return true;
	}

	public async stop() {
		const stopped = await super.stop();
		if(! stopped) return false;

		const swarm = this.swarm;
		const topic = this.topic;

		if(! swarm || ! topic) return false;

		await new Promise(resolve => {
			swarm.leave(topic, () => resolve(undefined));
		});

		return true;
	}
}

class HyperswarmPeer extends EncryptedStreamingPeer {
	public constructor(
		transportOptions: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>,
		socket: Duplex,
		client: boolean
	) {
		super(transportOptions, authProviders);

		this.setStream(socket, client);
	}
}
