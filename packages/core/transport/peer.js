'use strict';

const debug = require('debug')
const { EventEmitter } = require('events');
const eos = require('end-of-stream');
const msgpack = require('msgpack-lite');

module.exports = class Peer {
	constructor(transport) {
		this.networkId = transport.networkId;
		const ns = transport.debug ? transport.debug.namespace + ':peer' : 'ataraxia:peer';
		this.debug = debug(ns);
		this.events = new EventEmitter();

		// Reply to hello messages with our metadata
		this.events.on('hello', msg => {
			this.id = msg.id;
			this.version = msg.version;

			this.debug = debug(ns + ':' + msg.id);

			if(this.helloTimeout) {
				clearTimeout(this.helloTimeout);
			}

			// Assume we are connected when hello is received
			this.events.emit('connected');
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

		this.events.emit('disconnected');
	}

	negotiate() {
		// Write the hello message
		this.write('hello', {
			id: this.networkId,
			version: 1
		});

		// Wait a few seconds for the hello from the other side
		this.helloTimeout = setTimeout(() => {
			this.socket.destroy();
		}, 5000);
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
		this.socket.write(data);
	}
};
