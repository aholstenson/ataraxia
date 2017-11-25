'use strict';

const debug = require('debug')
const { EventEmitter } = require('events');
const eos = require('end-of-stream');
const msgpack = require('msgpack-lite');

const CURRENT_VERSION = 2;

module.exports = class Peer {
	constructor(transport) {
		this.networkId = transport.networkId;
		const ns = transport.debug ? transport.debug.namespace + ':peer' : 'ataraxia:peer';
		this.debug = debug(ns);
		this.events = new EventEmitter();
		this.connected = false;

		// Reply to hello messages with our metadata
		this.events.on('hello', msg => {
			this.id = msg.id;
			this.version = Math.min(msg.version, CURRENT_VERSION);

			this.debug = debug(ns + ':' + msg.id);

			if(this.helloTimeout) {
				clearTimeout(this.helloTimeout);
				this.helloTimeout = null;
			}

			if(this.version >= 2) {
				// Setup a ping every 5 seconds
				const pingInterval = 5000;
				this.pingSender = setInterval(() => this.write('ping'), pingInterval);
				this.pingTimeout = setTimeout(() => this.socket.destroy(), pingInterval * 4);
				this.on('ping', () => {
					if(! this.connected) {
						// Consider the peer connected
						this.connected = true;
						this.events.emit('connected');
					}

					clearTimeout(this.pingTimeout);
					this.pingTimeout = setTimeout(() => this.socket.destroy(), pingInterval * 4);
				});

				this.write('ping');
			} else {
				// Assume we are connected when hello is received
				this.events.emit('connected');
			}
		});
	}

	/**
	 * Set the socket
	 * @param {Socket} s
	 */
	setSocket(s) {
		this.socket = s;

		// Setup error and disconnected events
		eos(s, this.handleDisconnect.bind(this));

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

		return this.negotiate();
	}

	handleDisconnect(err) {
		if(typeof err !== 'undefined') {
			this.debug('Disconnected via an error:', err);
		} else {
			this.debug('Disconnected gracefully');
		}

		clearTimeout(this.helloTimeout);

		clearInterval(this.pingSender);
		clearTimeout(this.pingTimeout);

		this.connected = false;
		this.events.emit('disconnected');
	}

	negotiate() {
		// Write the hello message
		this.write('hello', {
			id: this.networkId,
			version: CURRENT_VERSION
		});

		// Wait a few seconds for the hello from the other side
		if(this.helloTimeout) {
			clearTimeout(this.helloTimeout);
		}
		this.helloTimeout = setTimeout(() => this.socket.destroy(), 5000);
	}

	on(event, handler) {
		this.events.on(event, handler);
	}

	disconnect() {
		this.debug('Requesting disconnect from peer');

		if(this.socket) {
			this.write('bye');
			this.socket.destroy();
		} else {
			this.handleDisconnect();
		}
	}

	send(payload) {
		this.write('message', payload);
	}

	write(type, payload) {
		const data = msgpack.encode([ String(type), payload ]);
		try {
			this.socket.write(data);
		} catch(err) {
			this.debug('Could not write;', err);
		}
	}
};
