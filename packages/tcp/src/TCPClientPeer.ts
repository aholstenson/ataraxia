import { connect } from 'net';

import { HostAndPort } from 'tinkerhub-discovery';

import {
	AuthProvider,
	BackOff,
	DisconnectReason,
	TransportOptions
} from 'ataraxia-transport';
import { EncryptedStreamingPeer } from 'ataraxia-transport-streams';

/**
 * Peer for TCP transport, used for outgoing connections to a server.
 */
export class TCPClientPeer extends EncryptedStreamingPeer {
	public addresses: HostAndPort[];

	private readonly backOff: BackOff;

	private addressAttempt: number;
	private connectTimeout: any;

	public constructor(
		options: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>,
		addresses: HostAndPort[]
	) {
		super(options, authProviders);

		this.backOff = new BackOff({
			delay: 100,
			maxDelay: 30000
		});

		this.addresses = addresses;
		this.addressAttempt = 0;

		this.tryConnect();
	}

	protected handleDisconnect(reason: DisconnectReason, err?: Error) {
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
	private tryConnect() {
		clearTimeout(this.connectTimeout);

		// Only continue if we have some addresses we know of
		if(this.addresses.length === 0) return;

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
		this.stopConnecting();
		super.disconnect();
	}

	public stopConnecting() {
		this.addresses = [];
		clearTimeout(this.connectTimeout);
	}
}
