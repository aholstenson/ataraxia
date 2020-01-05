import { Listener } from 'atvik';

import { SubscriptionHandle } from './SubscriptionHandle';

export interface Subscribable<This, Args extends any[] = []> {
	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	(listener: Listener<This, Args>): Promise<SubscriptionHandle>;

	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	subscribe(listener: Listener<This, Args>): Promise<SubscriptionHandle>;

	/**
	 * Unsubscribe a previously subscribed listener.
	 *
	 * @param listener
	 */
	unsubscribe(listener: Listener<This, Args>): Promise<boolean>;

	/**
	 * Subscribe to an event but only trigger the listener once.
	 *
	 * @param listener
	 */
	once(): Promise<Args>;
}
