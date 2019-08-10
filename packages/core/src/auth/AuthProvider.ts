import { AuthClientFlow } from './AuthClientFlow';
import { AuthServerFlow } from './AuthServerFlow';

/**
 * Authentication provider responsible for creating and managing authentication
 * flows.
 */
export interface AuthProvider {
	/**
	 * A readonly identifier for this provider. Used during authentication to
	 * uniquely identify the provider.
	 */
	readonly id: string;

	/**
	 * Create a client flow for the current network.
	 */
	createClientFlow?(): AuthClientFlow;

	/**
	 * Create a server flow for the current network.
	 */
	createServerFlow?(): AuthServerFlow;
}
