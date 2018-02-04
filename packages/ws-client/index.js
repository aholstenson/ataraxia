'use strict';

const { AbstractTransport, addPeer } = require('ataraxia/transport');
const AbstractWebSocketPeer = require('./abstract-peer');

module.exports = class WebSocketClient extends AbstractTransport {

	constructor(options) {
		super();

		this.options = Object.assign({}, options);
	}

	start(options) {
		return super.start(options)
			.then(started => {
				if(! started) return false;

				const peer = new WebSocketClientPeer(this);
				peer.createWebSocket = () => {
					this.debug('Trying to connect to', this.options.url);
					return new this.options.factory(
						this.options.url
					);
				};
				this[addPeer](peer);

				peer.tryConnect();

				return true;
			});
	}
}

class WebSocketClientPeer extends AbstractWebSocketPeer {

	constructor(parent, socket) {
		super(parent, socket);
	}

	handleDisconnect(err) {
		super.handleDisconnect(err);

		// TODO: Smarter back-off algorithm
		this.connectTimeout = setTimeout(() => this.tryConnect(), 60000);
	}

	tryConnect() {
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
