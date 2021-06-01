import { AbstractTransport, TransportOptions } from 'ataraxia/transport';
import { WebSocketFactory } from './WebSocketFactory';
import { WebSocketClientPeer } from './WebSocketClientPeer';
import { AuthProvider } from 'ataraxia';

/**
 * Options that can be used with `WebSocketClientTransport`.
 */
export interface WebSocketClientTransportOptions {
	/**
	 * The URL to the websocket.
	 */
	url: string;

	/**
	 * Factory used to create a WebSocket.
	 */
	webSocketFactory?: WebSocketFactory;

	/**
	 * Authentication providers to use for this transport.
	 */
	authentication: ReadonlyArray<AuthProvider>;
}

export class WebSocketClientTransport extends AbstractTransport {
	private readonly options: WebSocketClientTransportOptions;
	private peer?: WebSocketClientPeer;

	constructor(options: WebSocketClientTransportOptions) {
		super('ws-client');

		this.options = options;
	}

	public async start(options: TransportOptions): Promise<boolean> {
		const started = await super.start(options);

		if(! started) return false;

		const factory: WebSocketFactory = this.options.webSocketFactory
			|| defaultWebSocketFactory;

		this.peer = new WebSocketClientPeer(
			this.network,
			this.options.authentication,
			factory,
			this.options.url
		);

		this.addPeer(this.peer);

		// Start connecting to the peer
		this.peer.tryConnect();

		return true;
	}

	public async stop(): Promise<boolean> {
		const stopped = await super.stop();
		if(! stopped) return false;

		if(this.peer) {
			this.peer.disconnect();
		}

		return true;
	}
}

declare const WebSocket: any;

function defaultWebSocketFactory(url: string) {
	if(typeof WebSocket !== 'object') {
		throw new Error('No default WebSocket implementation found');
	}

	return new (WebSocket as any)(url);
}
