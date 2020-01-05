/**
 * Message for when another node no longer wants to subscribe to a certain
 * event on this node.
 */
export interface ServiceEventUnsubscribeMessage {
	/**
	 * The service this event unsubscribe is for.
	 */
	readonly service: string;

	/**
	 * The event that is being unsubscribed from.
	 */
	readonly event: string;
}
