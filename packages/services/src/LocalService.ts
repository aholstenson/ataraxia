/**
 * Definition of a local service. Used to enforce that an identifier is made
 * available during registration.
 */
export interface LocalService {
	/**
	 * The identifier of the service. This is the identifier this service will
	 * be made available with.
	 */
	id: string;

	/**
	 * Catch-all definition.
	 */
	[K: string]: any;
}
