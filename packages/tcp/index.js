'use strict';

const { AbstractTransport, Peer, addPeer } = require('ataraxia/transport');

const mdns = require('tinkerhub-mdns');
const net = require('net');
const eos = require('end-of-stream');

const setupPeer = Symbol('setupPeer');
const foundPeers = Symbol('foundPeers');
const stoppables = Symbol('stoppables');

/**
 * TCP based transport.
 */
module.exports = class TCP extends AbstractTransport {
	constructor(options={}) {
		super('tcp');

		this.options = Object.assign({
			discovery: true,
			peerCacheTime: 1800
		}, options);

		if(typeof this.options.peerCacheTime !== 'number' || this.options.peerCacheTime <= 0) {
			throw new Error('peerCacheTime must be a positive number');
		}

		if(typeof this.options.discovery !== 'boolean') {
			throw new Error('discovery must be a boolean');
		}

		if(typeof this.options.port !== 'undefined') {
			if(typeof this.options.port !== 'number') {
				throw new Error('port must be a number');
			}

			if(this.options.port <= 0 || this.options.port >= 65536) {
				throw new Error('port must be a valid port number (1-65535)');
			}
		}

		this[stoppables] = [];
		this.manualPeers = [];
	}

	start(options) {
		// Call super.start() and return if already started
		if(! super.start(options)) return false;

		this[foundPeers] = new Map();

		if(! options.endpoint) {
			this.server = net.createServer();

			// TODO: Better error handling
			this.server.on('error', err => {
				this.debug('Caught an error', err);
			});

			this.server.on('connection', socket => {
				const peer = new TCPPeer(this);
				peer.serverSocket = socket;
				this[addPeer](peer);
			});

			const listenCallback = () => {
				this.port = this.server.address().port;
				this.debug('Server started at port', this.port);

				if(this.options.discovery) {
					// Start mDNS, but only
					mdns.expose({
						name: this.networkId,
						type: options.name,
						port: this.port
					}).then(handle => this[stoppables].push(handle))
					.catch(err => this.debug('Could not expose service via mDNS;', err));
				}
			};

			if(typeof this.options.port === 'number') {
				this.server.listen(this.options.port, listenCallback);
			} else {
				this.server.listen(listenCallback);
			}

			// Stop the server when stopping transport
			this[stoppables].push({
				stop: () => this.server.close()
			});
		}

		if(this.options.discovery) {
			// Start discovering which peers we have if discovery is enabled
			const browser = mdns.browser({
				type: options.name
			}, this.options.peerCacheTime);
			this[stoppables].push(browser);

			// When a new peer is available, connect to it
			browser.on('available', service => {
				// Protect against connecting to ourselves
				if(service.name === this.networkId) return;

				// Check if we have started connections to this peer
				if(this[foundPeers].has(service.name)) return;

				// Setup the peer to attempt to connect to
				const peer = this[setupPeer](service);

				// Track the peer
				this[foundPeers].set(service.name, peer);
			});

			// If a peer is no longer available, stop connecting to it
			browser.on('unavailable', service => {
				const peer = this[foundPeers].get(service.name);
				if(! peer) return;

				peer.disconnect();

				this[foundPeers].delete(service.name);
			});

			browser.start();
		}

		// Request connection to all manual peers added
		for(const manualPeer of this.manualPeers) {
			this[setupPeer](manualPeer);
		}

		return true;
	}

	stop() {
		if(this.started) {
			this.stoppables.forEach(item => item.stop());
		}

		return super.stop();
	}

	addManualPeer(options) {
		if(! options) throw new Error('Address and port for peer must be specified');
		if(typeof options.address !== 'string') throw new Error('Address must be a string');
		if(typeof options.port !== 'number') throw new Error('Port must be a number');

		const data = {
			addresses: [ options.address ],
			port: options.port
		};
		this.manualPeers.push(data);

		if(this.started) {
			this[setupPeer](data);
		}
	}

	[setupPeer](data) {
		const peer = new TCPPeer(this);
		this[addPeer](peer);

		peer.setReachableVia(data.addresses, data.port);
		peer.tryConnect();

		return peer;
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
