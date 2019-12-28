import { createServer, Server } from 'tls';
import selfsigned from 'selfsigned';

import { ServicePublisher, ServiceDiscovery, MultiAddressService, HostAndPort } from 'tinkerhub-discovery';

import { AbstractTransport, TransportOptions } from 'ataraxia/transport';
import { encodeId } from 'ataraxia/id';

import { TCPPeerDiscovery } from './TCPPeerDiscovery';
import { TCPPeer } from './TCPPeer';

/**
 * Options that can be used for a TCP transport.
 */
export interface TCPTransportOptions {
	/**
	 * Port number for server. If undefined a port will automatically be
	 * assigned.
	 */
	port?: number;

	/**
	 * Discovery to use for finding related peers.
	 */
	discovery?: TCPPeerDiscovery;
}

/**
 * TCP based transport.
 */
export class TCPTransport extends AbstractTransport {
	private _port: number;
	private foundPeers: Map<string, TCPPeer>;

	private discovery?: TCPPeerDiscovery;
	private server?: Server;

	private servicePublisher?: ServicePublisher;
	private serviceDiscovery?: ServiceDiscovery<MultiAddressService>;

	private readonly manualPeers: HostAndPort[];

	constructor(options: TCPTransportOptions={}) {
		super('tcp');

		if(typeof options.port !== 'undefined') {
			if(options.port <= 0 || options.port >= 65536) {
				throw new Error('port must be a valid port number (1-65535)');
			}
		}

		this._port = options.port || 0;

		this.discovery = options.discovery;

		this.foundPeers = new Map();

		this.manualPeers = [];
	}

	public async start(options: TransportOptions) {
		const started = await super.start(options);

		if(! started) return false;

		if(! options.endpoint) {
			const cert = generateSelfSignedCertificate();
			this.server = createServer({
				key: cert.private,
				cert: cert.cert
			});

			// TODO: Better error handling
			this.server.on('error', err => {
				this.debug('Caught an error', err);
			});

			this.server.on('secureConnection', socket => {
				const peer = new TCPPeer(this.network);
				peer.serverSocket = socket;

				this.addPeer(peer);
			});

			const listenCallback = () => {
				if(! this.server) {
					return;
				}

				const address = this.server.address();
				if(address && typeof address !== 'string') {
					this._port = address.port;
				}

				this.debug('Server started at port', this._port);

				if(this.discovery && this.discovery.publish) {
					// A discovery is available, ask it to publish the service
					this.servicePublisher = this.discovery.publish({
						networkId: encodeId(this.network.networkId),
						networkName: options.networkName,
						port: this._port
					});
				}
			};

			if(this._port > 0) {
				this.server.listen(this._port, listenCallback);
			} else {
				this.server.listen(listenCallback);
			}
		}

		if(this.discovery && this.discovery.newDiscovery) {
			const encodedId = encodeId(this.network.networkId);

			// Attempt to start a discovery to find peers
			this.serviceDiscovery = this.discovery.newDiscovery({
				networkId: encodedId,
				networkName: options.networkName
			});

			if(this.serviceDiscovery) {
				// A discovery was started, listen to changes
				this.serviceDiscovery.onAvailable(service => {
					// Protect against connecting to ourselves
					if(service.id === encodedId) return;

					// Check if we have started connections to this peer
					if(this.foundPeers.has(service.id)) return;

					this.debug('Peer with id', service.id, 'now available, attempting connect');

					// Setup the peer to attempt to connect to
					const peer = this.setupPeer(service.addresses);

					// Track the peer
					this.foundPeers.set(service.id, peer);
				});

				this.serviceDiscovery.onUnavailable(service => {
					const peer = this.foundPeers.get(service.id);
					if(! peer) return;

					this.debug('Peer with id', service.id, 'no longer available, disconnecting');
					peer.disconnect();

					this.foundPeers.delete(service.id);
				});
			}
		}

		// Request connection to all manual peers added
		for(const manualPeer of this.manualPeers) {
			this.setupPeer([ manualPeer ]);
		}

		return true;
	}

	public async stop() {
		const stopped = await super.stop();
		if(! stopped) return false;

		if(this.servicePublisher) {
			await this.servicePublisher.destroy();
		}

		if(this.serviceDiscovery) {
			await this.serviceDiscovery.destroy();
		}

		if(this.server) {
			const server = this.server;
			await new Promise(resolve =>
				server.close(() => resolve())
			);

			this.server = undefined;
		}

		return true;
	}

	public addManualPeer(hostAndPort: HostAndPort) {
		if(! hostAndPort) {
			throw new Error('Address and port for peer must be specified');
		}

		if(typeof hostAndPort.host !== 'string') {
			throw new Error('host must be a string');
		}

		if(typeof hostAndPort.port !== 'number') {
			throw new Error('port must be a number');
		}

		this.manualPeers.push(hostAndPort);

		if(this.started) {
			this.setupPeer([ hostAndPort ]);
		}
	}

	private setupPeer(addresses: HostAndPort[]) {
		const peer = new TCPPeer(this.network);
		this.addPeer(peer);

		peer.setReachableVia(addresses);
		peer.tryConnect();

		return peer;
	}
}

function generateSelfSignedCertificate() {
	return selfsigned.generate([], { days: 365 * 5 });
}
