import { TLSSocket, connect, PeerCertificate } from 'tls';
import { HostAndPort } from 'tinkerhub-discovery';

import { WithNetwork } from 'ataraxia';
import { StreamingPeer, MergeablePeer, DisconnectReason } from 'ataraxia/transport';

export class TCPPeer extends StreamingPeer implements MergeablePeer {
	private _serverSocket?: TLSSocket;
	public addresses: HostAndPort[];

	private addressAttempt: number;
	private maxAttempts: number;
	private attempt: number;
	private connectTimeout: any;

	private privateKey?: Buffer;
	private certificate?: Buffer;

	constructor(
		network: WithNetwork,
		cert: null | { private: Buffer, cert: Buffer }
	) {
		super(network);

		this.privateKey = cert ? cert.private : undefined;
		this.certificate = cert ? cert.cert : undefined;

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

	protected localPublicSecurity(): ArrayBuffer | undefined {
		if(this._serverSocket) {
			return this.toSecurityBuffer(this._serverSocket.getCertificate());
		} else if(this.socket) {
			return this.toSecurityBuffer((this.socket as TLSSocket).getPeerCertificate());
		}
	}

	protected remotePublicSecurity(): ArrayBuffer | undefined {
		if(this._serverSocket) {
			return this.toSecurityBuffer(this._serverSocket.getPeerCertificate());
		} else if(this.socket) {
			return this.toSecurityBuffer((this.socket as TLSSocket).getCertificate());
		}
	}

	protected toSecurityBuffer(p: object | PeerCertificate | null): ArrayBuffer | undefined {
		if(! p) return undefined;

		const c = p as any;
		return c.raw && c.raw.buffer;
	}

	protected handleDisconnect(reason: DisconnectReason, err?: Error) {
		// Remove the server socket if it exists
		this._serverSocket = undefined;

		// Make sure that parent peer is disconnected
		super.handleDisconnect(reason, err);

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
			key: this.privateKey,
			cert: this.certificate,

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
