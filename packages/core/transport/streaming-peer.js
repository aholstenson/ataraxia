'use strict';

const msgpack = require('msgpack-lite');
const eos = require('end-of-stream');

const Peer = require('./peer');

module.exports = class StreamingPeer extends Peer {

	/**
	 * Create a new peer over the given transport.
	 *
	 * @param {AbstractTransport} transport
	 */
	constructor(transport) {
		super(transport);
	}

	/**
	 * Get if a socket is available.
	 */
	hasSocket() {
		return this.socket != null;
	}

	/**
	 * Set the socket being used for this peer.
	 *
	 * @param {Socket} s
	 */
	setSocket(s) {
		this.socket = s;

		// Reset version
		this.version = 0;

		// Setup error and disconnected events
		eos(s, err => {
			if(s === this.socket) {
				// Only trigger disconnect if this socket is active
				this.handleDisconnect(err)
			}
		});

		// Setup the decoder for incoming messages
		const decoder = msgpack.createDecodeStream();
		const pipe = s.pipe(decoder);

		decoder.on('data', data => {
			const type = data[0];
			const payload = data[1];

			this.debug('Incoming', type, 'with payload', payload);
			this.events.emit(type, payload);
		});

		// Catch errors on pipe and decoder
		decoder.on('error', err => this.debug('Error from decoder', err));
		pipe.on('error', err => this.debug('Error from pipe', err));
	}

	/**
	 * Handle disconnect event. In addition to the inherited behavior this will
	 * destroy the
	 */
	handleDisconnect(err) {
		this.socket = null;

		super.handleDisconnect();
	}

	requestDisconnect(err) {
		if(this.socket) {
			this.socket.destroy();
		}
	}

	/**
	 * Manually disconnect this peer.
	 */
	disconnect() {
		super.disconnect();

		if(this.socket) {
			this.write('bye');
			this.socket.destroy();
		} else {
			this.handleDisconnect();
		}
	}

	/**
	 * Write data to the peer via the current socket.
	 *
	 * @param {string} type
	 * @param {*} payload
	 */
	write(type, payload) {
		this.debug('Sending', type, 'with data', payload);
		const data = msgpack.encode([ String(type), payload ]);
		try {
			this.socket.write(data);
		} catch(err) {
			this.debug('Could not write;', err);
		}
	}
};
