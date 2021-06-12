import { MDNSServiceDiscovery, MDNSServicePublisher } from 'tinkerhub-mdns';

import { TCPPeerDiscovery, TCPDiscoveryDetails, TCPServerDetails } from './TCPPeerDiscovery';

/**
 * Discovery of peers using mDNS and DNS-SD on the local network. Will announce
 * using the name of the network.
 *
 * This discovery is intended to be used with {@link TCPBasedTransport}.
 *
 * Example:
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
 *
 * const net = new Network({
 *   name: 'ataraxia-example',
 *
 *   transports: [
 *     new TCPTransport({
 *       discovery: new TCPPeerMDNSDiscovery(),
 *
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *   ]
 * });
 * ```
 */
export class TCPPeerMDNSDiscovery implements TCPPeerDiscovery {
	public newDiscovery(options: TCPDiscoveryDetails) {
		return new MDNSServiceDiscovery({
			type: options.networkName
		}).filter(service => service.name !== options.networkId);
	}

	public publish(options: TCPServerDetails) {
		return new MDNSServicePublisher({
			name: options.networkId,

			type: options.networkName,

			port: options.port
		});
	}
}
