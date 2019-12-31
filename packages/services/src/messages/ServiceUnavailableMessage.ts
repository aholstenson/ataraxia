/**
 * Message sent to all nodes when a service is no longer available.
 */
export interface ServiceUnavailableMessage {
	/**
	 * The current version number for the node services.
	 */
	version: number;

	/**
	 * The service that is no longer available.
	 */
	service: string;
}
