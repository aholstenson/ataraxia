/**
 * Message for when another node subscribes to events about a service on this
 * node.
 */
export interface ServiceEventSubscribeMessage {
	/**
	 * The service to subscribe to.
	 */
	readonly service: string;

	/**
	 * The event being subscribed to.
	 */
	readonly event: string;
}
