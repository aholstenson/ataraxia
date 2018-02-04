'use strict';

const { Peer } = require('ataraxia/transport');
const msgpack = require('msgpack-lite');

const msgpackCodec = msgpack.createCodec({
	uint8array: true,
	preset: true
});

module.exports = class WebSocketPeer extends Peer {

	constructor(transport, socket) {
		super(transport);

		if(socket) {
			this.setSocket(socket);
		}
	}

	setSocket(socket) {
		this.socket = socket;

		socket.addEventListener('message', event => {
			const msg = msgpack.decode(event.data, { codec: msgpackCodec });
			this.debug('Incoming', msg[0], 'with payload', msg[1]);
			this.events.emit(msg[0], msg[1]);
		});

		socket.on('close', () => this.handleDisconnect());

		this.negotiate();
	}

	requestDisconnect() {
		this.socket.close();
	}

	disconnect() {
		super.disconnect();

		this.socket.close();
	}

	write(type, payload) {
		this.debug('Sending', type, 'with data', payload);
		const data = msgpack.encode([ String(type), payload ], { codec: msgpackCodec });
		this.socket.send(data);
	}
};
