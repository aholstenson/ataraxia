import { Authentication } from '../auth';

/**
 * Options provided to a transport as it is started.
 */
export interface TransportOptions {
	/**
	 * If this network is in endpoint mode. The transport can run in a client
	 * only mode when this is true.
	 */
	readonly endpoint: boolean;

	/**
	 * The identifier of this node on the network.
	 */
	readonly networkId: ArrayBuffer;

	/**
	 * The name of the network.
	 */
	readonly networkName: string;

	/**
	 * The namespace to use for debugging purposes.
	 */
	readonly debugNamespace: string;

	/**
	 * Authentication helper needed by to authenticate with other peers.
	 */
	readonly authentication: Authentication;
}
