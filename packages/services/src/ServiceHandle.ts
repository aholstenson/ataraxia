/**
 * Handle for a service that has been registered with the network.
 */
export interface ServiceHandle {
	/**
	 * Unregister this service.
	 */
	unregister(): void;
}
