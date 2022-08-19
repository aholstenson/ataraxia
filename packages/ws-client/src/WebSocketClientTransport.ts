import {
	AuthProvider,
	AbstractTransport,
	TransportOptions
} from 'ataraxia-transport';

import { WebSocketClientPeer } from './WebSocketClientPeer.js';
import { WebSocketFactory } from './WebSocketFactory.js';

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

/**
 * Transport that connects to the network over a web socket. This type of
 * transport requires a URL to connect to and the authentication methods to
 * use.
 *
 * For use outside browsers a function that creates a `WebSocket` instance
 * may be provided.
 *
 * Example:
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { WebSocketClientTransport } from 'ataraxia-ws-client';
 *
 * // Setup a network with a WebSocket client
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *
 *   transports: [
 *
 *     new WebSocketClientTransport({
 *       // URL to the websocket on the server
 *       url: 'ws://localhost:7000',
 *       // If using outside a browser, define how a WebSocket is created
 *       factory: url => new WebSocket(url),
 *       // Use anonymous authentication
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *
 *   ]
 * });
 *
 * await net.join();
 * ```
 */
export class WebSocketClientTransport extends AbstractTransport {
	private readonly options: WebSocketClientTransportOptions;
	private peer?: WebSocketClientPeer;

	public constructor(options: WebSocketClientTransportOptions) {
		super('ws-client');

		this.options = options;
	}

	public async start(options: TransportOptions): Promise<boolean> {
		const started = await super.start(options);

		if(! started) return false;

		const factory: WebSocketFactory = this.options.webSocketFactory
			|| defaultWebSocketFactory;

		this.peer = new WebSocketClientPeer(
			this.transportOptions,
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

/**
 * Default factory for creating a `WebSocket`. Will look for a global variable
 * called `WebSocket` which works well in browsers.
 *
 * @param url -
 *   URL to connect to
 * @returns
 *   instance of `WebSocket`
 */
function defaultWebSocketFactory(url: string) {
	if(typeof WebSocket !== 'object') {
		throw new Error('No default WebSocket implementation found');
	}

	return new WebSocket(url);
}
