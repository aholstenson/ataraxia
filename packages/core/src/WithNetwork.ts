import { Authentication } from './auth';

/**
 * Interface used for things that are tied to a network, such as transports.
 */
export interface WithNetwork {
	/**
	 * The identifier of the current node within the network.
	 */
	readonly networkId: ArrayBuffer;

	/**
	 * The debug namespace.
	 */
	readonly debugNamespace: string;

	/**
	 * Authentication helper for this network.
	 */
	readonly authentication: Authentication;
}
