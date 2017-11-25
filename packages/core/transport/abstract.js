'use strict';

const debug = require('debug');
const { EventEmitter } = require('events');

module.exports = class AbstractTransport {
	constructor(name) {
		this.events = new EventEmitter(this);
		this.peers = new Map();

		this.started = false;
		this.debug = debug('ataraxia:' + name);
	}

	on(event, handler) {
		this.events.on(event, handler);
	}

	off(event, handler) {
		this.events.removeListener(event, handler);
	}

	start(options) {
		if(this.started) {
			throw new Error('Transport already started');
		}

		this.debug('Starting with id `' + options.id + '`');
		this.started = true;
		this.networkId = options.id;
	}

	stop() {
		if(this.started) {
			return;
		}

		for(const peer of this.peers.values()) {
			peer.disconnect();
		}

		this.started = false;
	}

	addPeer(peer) {
		peer.on('connected', () => {
			if(peer.id === this.networkId) {
				// This peer points to ourself, ignore it
				this.debug('Connected to self, requesting disconnect');
				peer.disconnect();
				return;
			}

			if(this.peers.has(peer.id)) {
				/*
				 * This peer is already available via this transport. Two
				 * options:
				 *
				 * 1) Merge the peers if the peer-implementation supports it
				 * 2) Disconnect this peer
				 */
				if(peer.merge) {
					this.peers.get(peer.id).merge(peer);
				} else {
					peer.disconnect();
				}
			} else {
				// New peer, connect to it
				this.peers.set(peer.id, peer);

				this.events.emit('connected', peer);
			}
		});

		peer.on('disconnected', () => {
			const stored = this.peers.get(peer.id);
			if(stored === peer) {
				this.peers.delete(peer.id);

				this.events.emit('disconnected', peer);
			}
		});
	}
};
