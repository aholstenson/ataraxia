import { MDNSServiceDiscovery, MDNSServicePublisher } from 'tinkerhub-mdns';

import { TCPPeerDiscovery, TCPDiscoveryDetails, TCPServerDetails } from './TCPPeerDiscovery';

/**
 * Discovery of peers using mDNS and DNS-SD on the local network. Will announce
 * using the name of the network.
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
