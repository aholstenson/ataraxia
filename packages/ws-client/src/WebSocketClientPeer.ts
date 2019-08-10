import { WithNetwork } from 'ataraxia';
import { AbstractWebSocketPeer } from './AbstractWebSocketPeer';

import { WebSocketFactory } from './WebSocketFactory';

export class WebSocketClientPeer extends AbstractWebSocketPeer {
	private readonly factory: WebSocketFactory;
	private readonly url: string;

	private connectTimeout: any;

	constructor(
		parent: WithNetwork,
		factory: WebSocketFactory,
		url: string
	) {
		super(parent);

		this.factory = factory;
		this.url = url;
	}

	protected handleDisconnect(err?: Error) {
		// If we are already waiting for a connection ignore this call
		if(this.connectTimeout) return;

		super.handleDisconnect(err);

		// TODO: Smarter back-off algorithm
		const retryTime = 30000;
		this.debug('Reconnecting in', retryTime, 'ms');
		this.connectTimeout = setTimeout(() => this.tryConnect(), retryTime);
	}

	public tryConnect() {
		// Make sure to clear the connection timeout when attempting to reconnect
		clearTimeout(this.connectTimeout);
		this.connectTimeout = null;

		// Create and setup the new WebSocket
		const ws = this.factory(this.url);

		ws.addEventListener('open', () => {
			this.debug('Connected');

			this.setSocket(ws);

			this.negotiateAsClient();
		});

		ws.addEventListener('close', () => this.handleDisconnect());
		ws.addEventListener('error', () => this.handleDisconnect());
	}

	public disconnect() {
		super.disconnect();

		clearTimeout(this.connectTimeout);
	}
}
