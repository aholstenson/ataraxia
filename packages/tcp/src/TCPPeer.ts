import { TLSSocket, connect } from 'tls';
import { HostAndPort } from 'tinkerhub-discovery';

import { WithNetwork } from 'ataraxia';
import { StreamingPeer, MergeablePeer } from 'ataraxia/transport';

export class TCPPeer extends StreamingPeer implements MergeablePeer {
	private _serverSocket?: TLSSocket;
	public addresses: HostAndPort[];

	private addressAttempt: number;
	private maxAttempts: number;
	private attempt: number;
	private connectTimeout: any;

	constructor(network: WithNetwork) {
		super(network);

		this.addresses = [];
		this.addressAttempt = 0;
		this.maxAttempts = 0;
		this.attempt = 0;
	}

	public merge(peer: this) {
		if(! this.addresses && peer.addresses) {
			this.addresses = peer.addresses;
		}
	}

	set serverSocket(socket: TLSSocket | undefined) {
		if(! socket) {
			throw new Error('Tried setting an undefined server socket');
		}

		this._serverSocket = socket;

		// Setup the server socket to remove itself if it disconnects
		socket.on('close', () => this._serverSocket = undefined);

		// Use this connection if there is no other connection active
		this.setSocket(socket);
		this.negotiateAsServer();
	}

	get serverSocket() {
		return this._serverSocket;
	}

	public setReachableVia(addresses: HostAndPort[]) {
		this.addresses = addresses;
		this.addressAttempt = 0;

		this.maxAttempts = addresses.length * 10;
		this.attempt = 0;
	}

	protected handleDisconnect(err: Error) {
		// Remove the server socket if it exists
		this._serverSocket = undefined;

		// Make sure that parent peer is disconnected
		super.handleDisconnect(err);

		// Only continue with reconnect if not disconnected and we have addresses to try
		if(this.disconnected || this.addresses.length === 0) return;

		this.addressAttempt++;
		if(this.addressAttempt < this.addresses.length) {
			this.debug('Attempting to connect to next address');
			this.tryConnect();
		} else {
			if(this.attempt >= this.maxAttempts) {
				this.debug('Reached the connection attempt limit');
			} else {
				this.debug('No more addresses to try, trying in 60 seconds');
				this.addressAttempt = 0;
				this.connectTimeout = setTimeout(() => this.tryConnect(), 60000);
			}
		}
	}

	public tryConnect() {
		clearTimeout(this.connectTimeout);

		// Only continue if we have some addresses we know of
		if(! this.addresses) return;

		const address = this.addresses[this.addressAttempt];
		this.debug('Attempting connect to ' + address.host + ':' + address.port);

		this.attempt++;

		const client = connect({
			host: address.host,
			port: address.port,

			rejectUnauthorized: false
		});
		client.setKeepAlive(true);
		client.on('connect', () => {
			this.attempt = 0;
			this.addressAttempt--;
			this.debug('Connected via ' + address.host + ':' + address.port);

			this.negotiateAsClient();
		});
		this.setSocket(client);
	}

	public disconnect() {
		super.disconnect();
		clearTimeout(this.connectTimeout);
	}
}
