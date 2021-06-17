import { Socket } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { Duplex } from 'stream';

import { Event, Subscribable } from 'atvik';
import { LowLevelNetwork } from 'local-machine-network';

import {
	AbstractTransport,
	TransportOptions,
	DisconnectReason,
	AnonymousAuth,
	AuthProvider
} from 'ataraxia-transport';
import { StreamingPeer } from 'ataraxia-transport-streams';

const AUTH = [ new AnonymousAuth() ];

/**
 * Options available for MachineLocalTransport.
 */
export interface MachineLocalTransportOptions {
	/**
	 * The path of the local socket. If not specified the transport defaults
	 * to creating a socket in the temporary directory of the system.
	 */
	path?: string;

	/**
	 * Optional function that will be run if this instance becomes the leader
	 * of the local network.
	 */
	onLeader?: () => void;
}

/**
 * Machine local transport. Uses Unix sockets to connect to peers on the
 * same machine.
 *
 * Usage example:
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { MachineLocalTransport } from 'ataraxia-local';
 *
 * // Setup a network
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *
 *   transports: [
 *     new MachineLocalTransport()
 *   ]
 * });
 *
 * await net.join();
 * ```
 *
 * The event {@link onLeader} or the option {@link MachineLocalTransportOptions.onLeader}
 * can be used to perform actions if the transport instance becomes the leader
 * of nodes running on the local machine.
 *
 * Example starting a TCP transport when becoming the leader:
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
 * import { MachineLocalTransport } from 'ataraxia-local';
 *
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 * });
 *
 * net.addTransport(new MachineLocalTransport({
 *   onLeader: () => {
 *     net.addTransport(new TCPTransport({
 *       discovery: new TCPPeerMDNSDiscovery(),
 *
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     }));
 *   }
 * });
 *
 * await net.join();
 * ```
 */
export class MachineLocalTransport extends AbstractTransport {
	private path: string;
	private _leader: boolean;
	private net?: LowLevelNetwork;

	private leaderEvent: Event<this>;

	public constructor(options?: MachineLocalTransportOptions) {
		super('local');

		this._leader = false;
		this.leaderEvent = new Event(this);

		this.path = (options && options.path) || tmpdir();

		if(options?.onLeader) {
			this.leaderEvent.subscribe(options.onLeader);
		}
	}

	/**
	 * Get if this instance is considered the leader of the nodes running on
	 * this local machine.
	 *
	 * @returns
	 *   `true` if this instance is the leader
	 */
	public get leader() {
		return this._leader;
	}

	/**
	 * Event emitted if this instance becomes the leader of nodes running on
	 * this local machine.
	 *
	 * ```javascript
	 * instance.onLeader(() => {
	 *    // Do something here, such as starting another transport
	 * });
	 * ```
	 *
	 * @returns
	 *   subscribable
	 */
	public get onLeader(): Subscribable<this> {
		return this.leaderEvent.subscribable;
	}

	public async start(options: TransportOptions): Promise<boolean> {
		const started = await super.start(options);
		if(! started) return false;

		const id = join(this.path, options.networkName);

		this.net = new LowLevelNetwork({
			path: id
		});

		this.net.onError(err => {
			this.debug('Caught error:', err);
		});

		this.net.onLeader(() => {
			this.debug('This node is now the leader of the machine-local network');
			this.leaderEvent.emit();
		});

		const handlePeer = (socket: Socket, server: boolean) => {
			const peer = new LocalPeer(this.transportOptions, AUTH, socket, ! server);
			this.addPeer(peer);
		};

		this.net.onConnection(peer => handlePeer(peer, true));
		this.net.onConnect(peer => handlePeer(peer, false));

		await this.net.start();

		return true;
	}

	public async stop() {
		const stopped = await super.stop();

		if(stopped && this.net) {
			await this.net.stop();
		}

		return stopped;
	}
}


class LocalPeer extends StreamingPeer {
	public constructor(
		transportOptions: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>,
		socket: Duplex,
		client: boolean
	) {
		super(transportOptions, authProviders);

		this.setStream(socket, client);
	}

	public disconnect() {
		// Disconnect does nothing for local transport
		this.handleDisconnect(DisconnectReason.Manual);
	}
}
