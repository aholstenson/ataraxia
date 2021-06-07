import { ServiceDiscovery, MultiAddressService, ServicePublisher } from 'tinkerhub-discovery';

/**
 * Details about the TCP transport available when creating a discovery for
 * other peers.
 */
export interface TCPDiscoveryDetails {
	/*
	 * The identifier of this node in the network.
	 */
	networkId: string;

	/**
	 * The name of the network.
	 */
	networkName: string;
}

/**
 * Details about the active TCP transport, used for publishing.
 */
export interface TCPServerDetails {
	/**
	 * The identifier of this node in the network.
	 */
	networkId: string;

	/**
	 * The name of the network.
	 */
	networkName: string;

	/**
	 * The port number that the TCP server is running at.
	 */
	port: number;
}

/**
 * Discovery for addresses of TCP peers.
 */
export interface TCPPeerDiscovery {
	/**
	 * Create a discovery that will return peers to connect to.
	 *
	 * @param details -
	 *   details to use when finding peers
	 * @returns
	 *   instance of `ServiceDiscovery` or `undefined` if no discovery was
	 *   started
	 */
	newDiscovery?(details: TCPDiscoveryDetails): ServiceDiscovery<MultiAddressService> | undefined;

	/**
	 * Optional function used to publish information about the TCP transport
	 * so a discovery can see it.
	 *
	 * @param details -
	 *   details to publish
	 * @returns
	 *   instance of `ServicePublisher` or `undefined` if service was not
	 *   published
	 */
	publish?(details: TCPServerDetails): ServicePublisher | undefined;
}
