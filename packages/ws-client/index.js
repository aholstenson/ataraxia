'use strict';

const { AbstractTransport, addPeer } = require('ataraxia/transport');
const AbstractWebSocketPeer = require('./abstract-peer');

/**
 * Implementation of a transport that connect to over WebSocket to a server.
 */
module.exports = class WebSocketClient extends AbstractTransport {

	constructor(options) {
		super('ws-client');

		this.options = Object.assign({}, options);
	}

	start(options) {
		return super.start(options)
			.then(started => {
				if(! started) return false;

				const options = this.options;

				this.peer = new WebSocketClientPeer(this);

				// Setup the factory that creates the actual WebSocket instance
				this.peer.createWebSocket = function() {
					this.debug('Trying to connect to', options.url);
					return new options.factory(
						options.url
					);
				};

				// Add the peer
				this[addPeer](this.peer);

				// Start connecting to the peer
				this.peer.tryConnect();

				return true;
			});
	}

	stop() {
		return super.stop()
			.then(stopped => {
				if(! stopped) return false;

				// Disconnect the peer
				this.peer.disconnect();

				return true;
			});
	}
}

class WebSocketClientPeer extends AbstractWebSocketPeer {

	constructor(parent, socket) {
		super(parent, socket);
	}

	handleDisconnect(err) {
		// If we are already waiting for a connection ignore this call
		if(this.connectTimeout) return;

		super.handleDisconnect(err);

		// TODO: Smarter back-off algorithm
		const retryTime = 30000;
		this.debug('Reconnecting in', retryTime, 'ms');
		this.connectTimeout = setTimeout(() => this.tryConnect(), retryTime);
	}

	tryConnect() {
		// Make sure to clear the connection timeout when attempting to reconnect
		clearTimeout(this.connectTimeout);
		this.connectTimeout = null;

		// Create and setup the new WebSocket
		const ws = this.createWebSocket();

		ws.addEventListener('open', () => {
			this.debug('Connected');

			this.setSocket(ws);
		});

		ws.addEventListener('close', () => this.handleDisconnect());
		ws.addEventListener('error', () => this.handleDisconnect());
	}

	disconnect() {
		super.disconnect();
		clearTimeout(this.connectTimeout);
	}
}
