import hyperswarm, { Swarm } from 'hyperswarm';
import peer from 'noise-peer';

import { AuthProvider, WithNetwork } from 'ataraxia';
import { AbstractTransport, StreamingPeer, TransportOptions } from 'ataraxia/transport';

import { createHash } from 'crypto';
import { Duplex } from 'stream';

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
 * Hyperswarm based transport.
 */
export class HyperswarmTransport extends AbstractTransport {
	private readonly options: HyperswarmTransportOptions;

	private topic?: Buffer;
	private swarm?: Swarm;

	constructor(options: HyperswarmTransportOptions) {
		super('hyperswarm');

		this.options = options;
	}

	public async start(options: TransportOptions) {
		const started = await super.start(options);

		if(! started) return false;

		const swarm = this.swarm = hyperswarm({
			// Assume that endpoints are short-lived
			ephemeral: options.endpoint ? true : undefined
		});

		const topic = this.topic = createHash('sha256')
			.update(this.options.topic)
			.digest();

		this.debug('Joining the topic', topic.toString('hex'));

		swarm.on('peer', peer => this.debug('Found a new peer ' + peer.host + ':' + peer.port));

		swarm.on('connection', (socket, info) => {
			this.debug('Connecting to a peer, client=', info.client);

			this.addPeer(new HyperswarmPeer(
				this.network,
				this.options.authentication,
				socket,
				info.client
			));
		});

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

class HyperswarmPeer extends StreamingPeer {
	constructor(
		network: WithNetwork,
		authProviders: ReadonlyArray<AuthProvider>,
		socket: Duplex,
		client: boolean
	) {
		super(network, authProviders);

		const stream = peer(socket, client);
		this.setStream(stream);

		stream.on('connected', () => {
			if(client) {
				this.negotiateAsClient();
			} else {
				this.negotiateAsServer();
			}
		});
	}
}
