import {
	AuthProvider,
	BackOff,
	DisconnectReason,
	TransportOptions
} from 'ataraxia-transport';

import { AbstractWebSocketPeer } from './AbstractWebSocketPeer.js';
import { WebSocketFactory } from './WebSocketFactory.js';

export class WebSocketClientPeer extends AbstractWebSocketPeer {
	private readonly factory: WebSocketFactory;
	private readonly url: string;

	private readonly backOff: BackOff;

	private connectTimeout: any;

	public constructor(
		transportOptions: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>,
		factory: WebSocketFactory,
		url: string
	) {
		super(transportOptions, authProviders);

		this.factory = factory;
		this.url = url;

		this.backOff = new BackOff({
			delay: 100,
			maxDelay: 30000
		});
	}

	protected handleDisconnect(reason: DisconnectReason, err?: Error) {
		// If we are already waiting for a connection ignore this call
		if(this.connectTimeout) return;

		super.handleDisconnect(reason, err);

		const delay = this.backOff.nextDelay();
		this.debug('Reconnecting in', delay, 'ms');
		this.connectTimeout = setTimeout(() => this.tryConnect(), delay);
	}

	public tryConnect() {
		// Make sure to clear the connection timeout when attempting to reconnect
		clearTimeout(this.connectTimeout);
		this.connectTimeout = null;

		// Create and setup the new WebSocket
		const ws = this.factory(this.url);

		ws.addEventListener('open', () => {
			this.debug('Connected');

			this.backOff.reset();
			this.negotiateAsClient();
		});

		this.setSocket(ws);
	}

	public disconnect() {
		super.disconnect();

		clearTimeout(this.connectTimeout);
	}
}
