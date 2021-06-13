import { Socket, connect } from 'net';

import { HostAndPort } from 'tinkerhub-discovery';

import { WithNetwork, BackOff, AuthProvider } from 'ataraxia';
import { EncryptedStreamingPeer, DisconnectReason } from 'ataraxia/transport';

/**
 * Peer for TCP transport, represents either a server or a client connection.
 */
export class TCPPeer extends EncryptedStreamingPeer {
	private _serverSocket?: Socket;
	public addresses: HostAndPort[];

	private readonly backOff: BackOff;

	private addressAttempt: number;
	private connectTimeout: any;

	public constructor(
		network: WithNetwork,
		authProviders: ReadonlyArray<AuthProvider>
	) {
		super(network, authProviders);

		this.backOff = new BackOff({
			delay: 100,
			maxDelay: 30000
		});

		this.addresses = [];
		this.addressAttempt = 0;
	}

	/**
	 * Set socket to use in server mode.
	 */
	public set serverSocket(socket: Socket | undefined) {
		if(! socket) {
			throw new Error('Tried setting an undefined server socket');
		}

		this._serverSocket = socket;

		this.debug('Client connected from', socket.remoteAddress);

		// Setup the server socket to remove itself if it disconnects
		socket.on('close', () => this._serverSocket = undefined);

		// Use this connection if there is no other connection active
		this.setStream(socket, false);
	}

	public get serverSocket() {
		return this._serverSocket;
	}

	/**
	 * Set the addresses that this peer can be reached via.
	 *
	 * @param addresses -
	 *   array of host and ports
	 */
	public setReachableVia(addresses: HostAndPort[]) {
		this.addresses = addresses;
		this.addressAttempt = 0;
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
			const delay = this.backOff.nextDelay();
			this.debug('No more addresses to try, trying in', delay, 'ms');
			this.addressAttempt = 0;
			this.connectTimeout = setTimeout(() => this.tryConnect(), delay);
		}
	}

	/**
	 * Attempt to connect to a server, will try addresses in order.
	 */
	public tryConnect() {
		clearTimeout(this.connectTimeout);

		// Only continue if we have some addresses we know of
		if(! this.addresses) return;

		const address = this.addresses[this.addressAttempt];
		this.debug('Attempting connect to ' + address.host + ':' + address.port);

		const client = connect({
			host: address.host,
			port: address.port
		});
		client.setKeepAlive(true);
		client.on('connect', () => {
			this.debug('Negotiating connection via ' + address.host + ':' + address.port);
		});

		this.debug('Connected via ' + address.host + ':' + address.port);
		this.setStream(client, true);
	}

	protected didConnect() {
		this.addressAttempt--;
		this.backOff.reset();
	}

	public disconnect() {
		super.disconnect();
		clearTimeout(this.connectTimeout);
	}
}
