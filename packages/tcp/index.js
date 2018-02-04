'use strict';

const { AbstractTransport, Peer } = require('ataraxia/transport');

const mdns = require('tinkerhub-mdns');
const net = require('net');
const eos = require('end-of-stream');

/**
 * TCP based transport.
 */
module.exports = class TCP extends AbstractTransport {
	constructor() {
		super('tcp');

		this.stoppables = [];
	}

	start(options) {
		// Call super.start() and return if already started
		if(! super.start(options)) return false;

		this.foundPeers = new Map();

		if(! options.endpoint) {
			this.server = net.createServer();

			// TODO: Better error handling
			this.server.on('error', err => {
				this.debug('Caught an error', err);
			});

			this.server.on('connection', socket => {
				const peer = new TCPPeer(this);
				peer.serverSocket = socket;
				this.addPeer(peer);
			});

			this.server.listen(() => {
				this.port = this.server.address().port;
				mdns.expose({
					name: this.networkId,
					type: options.name,
					port: this.port
				}).then(handle => this.stoppables.push(handle))
				.catch(err => this.debug('Could not expose service via mDNS;', err));
			});
		}

		// Start discovering which peers we have
		const browser = mdns.browser({
			type: options.name
		}, 600);
		this.stoppables.push(browser);

		// When a new peer is available, connect to it
		browser.on('available', service => {
			// Protect against connecting to ourselves
			if(service.name === this.networkId) return;

			// Check if we have started connections to this peer
			if(this.foundPeers.has(service.name)) return;

			const peer = new TCPPeer(this, service.name);
			this.addPeer(peer);
			peer.setReachableVia(service.addresses, service.port);
			peer.tryConnect();

			// Track the peer
			this.foundPeers.set(service.name, peer);
		});

		// If a peer is no longer available, stop connecting to it
		browser.on('unavailable', service => {
			const peer = this.foundPeers.get(service.name);
			if(! peer) return;

			peer.disconnect();

			this.foundPeers.delete(service.name);
		});

		browser.start();

		return true;
	}

	stop() {
		if(this.started) {
			this.stoppables.forEach(item => item.stop());
		}

		return super.stop();
	}
}

class TCPPeer extends Peer {
	constructor(transport) {
		super(transport);
	}

	merge(other) {
		if(other.serverSocket) {
			this.serverSocket = other.serverSocket;
		}

		if(other.addresses) {
			this.setReachableVia(other.addresses, other.port);
		}
	}

	set serverSocket(socket) {
		this._serverSocket = socket;

		if(socket) {
			// Setup the server socket to remove itself if it disconnects
			eos(socket, () => this._serverSocket = null);
		}

		if(! this.hasSocket() && socket) {
			// Use this connection if there is no other connection active
			this.setSocket(socket);
			this.negotiate();
		}
	}

	get serverSocket() {
		return this._serverSocket;
	}

	setReachableVia(addresses, port) {
		this.addresses = addresses;
		this.addressAttempt = 0;
		this.port = port;

		this.maxAttempts = addresses.length * 10;
		this.attempt = 0;
	}

	handleDisconnect(err) {
		super.handleDisconnect();

		// Protect against no known addresses
		if(! this.addresses) return;

		this.addressAttempt++;
		if(this.addressAttempt < this.addresses.length) {
			this.debug('Attempting to connect to next address');
			this.tryConnect();
		} else {
			if(this.attempt >= this.maxAttempts) {
				this.debug('Reached the connection attempt limit');
			} else {
				this.debug('No more addresses to try, trying in 60 seconds');
				this.addressAttempt = 0;
				this.connectTimeout = setTimeout(() => this.tryConnect(), 60000);
			}
		}
	}

	tryConnect() {
		if(this.serverSocket) {
			// Seems like there is an incoming connection, use it
			this.setSocket(this._serverSocket);
			this.negotiate();
			return;
		}

		// Only continue if we have some addresses we know of
		if(! this.addresses) return;

		const address = this.addresses[this.addressAttempt];
		this.debug('Attempting connect to ' + address + ':' + this.port);

		this.attempt++;

		const client = net.connect({
			host: address,
			port: this.port
		});
		client.setKeepAlive(true);
		client.on('connect', () => {
			this.attempt = 0;
			this.addressAttempt--;
			this.debug('Connected via ' + address + ':' + this.port);

			this.negotiate();
		});
		this.setSocket(client);
	}

	disconnect() {
		super.disconnect();
		clearTimeout(this.connectTimeout);
	}
}
