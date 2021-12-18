import { WebSocketServer, ServerOptions, WebSocket } from 'ws';

import {
	AbstractTransport,
	AuthProvider,
	TransportOptions
} from 'ataraxia-transport';
import { AbstractWebSocketPeer } from 'ataraxia-ws-client';

export interface WebSocketServerTransportOptions extends ServerOptions {
	/**
	 * Authentication providers to use for this transport.
	 */
	authentication: ReadonlyArray<AuthProvider>;
}

export class WebSocketServerTransport extends AbstractTransport {
	private options: WebSocketServerTransportOptions;
	public server?: WebSocketServer;

	public constructor(options: WebSocketServerTransportOptions) {
		super('ws-server');

		if(! options) {
			throw new Error('WebSocketServerTransport requires options, such as a port');
		}

		this.options = options;
	}

	public async start(options: TransportOptions): Promise<boolean> {
		const started = await super.start(options);

		if(! started) return false;

		this.server = new WebSocketServer(this.options);

		this.server.on('connection', socket => {
			const peer = new WebsocketServerPeer(this.transportOptions, this.options.authentication);
			this.addPeer(peer);

			peer.setSocket(socket);
		});

		this.server.on('error', err => {
			this.debug('Ignoring error:', err);
		});

		if(! this.options.server && ! this.options.noServer) {
			// If not using an existing server wait until the server is started
			const server = this.server;
			return new Promise(resolve =>
				server.on('listening', () => resolve(true))
			);
		}

		return true;
	}

	public async stop() {
		const stopped = await super.stop();
		if(! stopped) return false;

		if(this.server) {
			const server = this.server;
			await new Promise(resolve =>
				server.close(() => resolve(undefined))
			);

			this.server = undefined;
		}

		return true;
	}
}

class WebsocketServerPeer extends AbstractWebSocketPeer {
	public setSocket(socket: WebSocket) {
		super.setSocket(socket);

		this.negotiateAsServer();
	}
}
