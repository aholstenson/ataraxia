/**
 * Handle representing a subscription on a service.
 */
export interface SubscriptionHandle {
	/**
	 * Unsubscribe, the listener will no longer receive events.
	 *
	 * @returns
	 *   promise that resolves when event is unsubscribed successfully
	 */
	unsubscribe(): Promise<void>;
}
