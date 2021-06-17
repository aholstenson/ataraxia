import { createServer, Server } from 'net';

import { ServicePublisher, ServiceDiscovery, MultiAddressService, HostAndPort } from 'tinkerhub-discovery';

import { AbstractTransport, AuthProvider, encodeId, TransportOptions } from 'ataraxia-transport';

import { TCPClientPeer } from './TCPClientPeer';
import { TCPPeerDiscovery } from './TCPPeerDiscovery';
import { TCPServerPeer } from './TCPServerPeer';

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

	/**
	 * Authentication providers to use for this transport.
	 */
	authentication: ReadonlyArray<AuthProvider>;
}

/**
 * TCP based transport.
 */
export class TCPTransport extends AbstractTransport {
	private readonly authProviders: ReadonlyArray<AuthProvider>;

	private _port: number;
	private foundPeers: Map<string, TCPClientPeer>;

	private discovery?: TCPPeerDiscovery;
	private server?: Server;

	private servicePublisher?: ServicePublisher;
	private serviceDiscovery?: ServiceDiscovery<MultiAddressService>;

	private readonly manualPeers: HostAndPort[];

	public constructor(options: TCPTransportOptions) {
		super('tcp');

		if(typeof options.port !== 'undefined') {
			if(options.port <= 0 || options.port >= 65536) {
				throw new Error('port must be a valid port number (1-65535)');
			}
		}

		this.authProviders = options.authentication;

		this._port = options.port || 0;

		this.discovery = options.discovery;

		this.foundPeers = new Map();

		this.manualPeers = [];
	}

	/**
	 * Get the port number the transport was bound to.
	 *
	 * @returns
	 *   port number, or `0` if no server was started
	 */
	public get port() {
		return this._port;
	}

	public async start(options: TransportOptions) {
		const started = await super.start(options);

		if(! started) return false;

		if(! options.endpoint) {
			this.server = createServer();

			// TODO: Better error handling
			this.server.on('error', err => {
				this.debug('Caught an error', err);
			});

			this.server.on('connection', socket => {
				const peer = new TCPServerPeer(
					this.transportOptions,
					this.authProviders,
					socket
				);

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
						networkId: encodeId(this.transportOptions.networkId),
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
			const encodedId = encodeId(this.transportOptions.networkId);

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
					const peer = this.connectToPeer(service.addresses);

					// Track the peer
					this.foundPeers.set(service.id, peer);
				});

				this.serviceDiscovery.onUnavailable(service => {
					const peer = this.foundPeers.get(service.id);
					if(! peer) return;

					this.debug('Peer with id', service.id, 'no longer available, will no longer try reconnecting');
					peer.stopConnecting();

					this.foundPeers.delete(service.id);
				});
			}
		}

		// Request connection to all manual peers added
		for(const manualPeer of this.manualPeers) {
			this.connectToPeer([ manualPeer ]);
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
				server.close(() => resolve(undefined))
			);

			this.server = undefined;
		}

		return true;
	}

	public addManualPeer(hostAndPort: { host: string; port: number }) {
		if(! hostAndPort) {
			throw new Error('Address and port for peer must be specified');
		}

		if(typeof hostAndPort.host !== 'string') {
			throw new Error('host must be a string');
		}

		if(typeof hostAndPort.port !== 'number') {
			throw new Error('port must be a number');
		}

		const instance = new HostAndPort(hostAndPort.host, hostAndPort.port);
		this.manualPeers.push(instance);

		if(this.started) {
			this.connectToPeer([ instance ]);
		}
	}

	private connectToPeer(addresses: HostAndPort[]) {
		const peer = new TCPClientPeer(
			this.transportOptions,
			this.authProviders,
			addresses
		);
		this.addPeer(peer);
		return peer;
	}
}
