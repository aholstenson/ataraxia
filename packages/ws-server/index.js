'use strict';

const WebSocket = require('ws');
const { AbstractTransport, addPeer } = require('ataraxia/transport');
const WebSocketPeer = require('ataraxia-ws-client/abstract-peer');

module.exports = class WebSocketServer extends AbstractTransport {

	constructor(options) {
		super();

		this.options = Object.assign({}, options);
	}

	start(options) {
		return super.start(options)
			.then(started => {
				if(! started) return false;

				return new Promise((resolve, reject) => {
					this.ws = new WebSocket.Server(this.options);

					this.ws.on('connection', socket => {
						this[addPeer](new WebSocketPeer(this, socket));
					});

					if(this.options.server) {
						resolve(true);
					} else {
						this.ws.on('listening', () => resolve(true));
					}
				});
			});
	}
}

