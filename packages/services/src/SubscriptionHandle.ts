/**
 * Handle representing a subscription on a service.
 */
export interface SubscriptionHandle {
	/**
	 * Unsubscribe, the listener will no longer receive events.
	 */
	unsubscribe(): Promise<void>;
}
