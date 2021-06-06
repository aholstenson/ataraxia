import { Socket } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';

import { Event, Subscribable } from 'atvik';
import { LowLevelNetwork } from 'local-machine-network';

import { AnonymousAuth } from 'ataraxia';
import {
	AbstractTransport,
	StreamingPeer,
	TransportOptions,
	DisconnectReason
} from 'ataraxia/transport';

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

	public get leader() {
		return this._leader;
	}

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
			const peer = new LocalPeer(this.network, AUTH);
			peer.setStream(socket);
			if(server) {
				peer.negotiateAsServer();
			} else {
				peer.negotiateAsClient();
			}
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
	public disconnect() {
		// Disconnect does nothing for local transport
		this.handleDisconnect(DisconnectReason.Manual);
	}
}
