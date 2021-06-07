import { Listener } from 'atvik';

import { SubscriptionHandle } from './SubscriptionHandle';

/**
 * Asynchronous subscribable.
 */
export interface Subscribable<This, Args extends any[] = []> {
	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 *
	 * @returns
	 *   promise that resolves when event is subscribed, returns a handle that
	 *   can be used to unsubscribe
	 */
	(listener: Listener<This, Args>): Promise<SubscriptionHandle>;

	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 *
	 * @returns
	 *   promise that resolves when event is subscribed, returns a handle that
	 *   can be used to unsubscribe
	 */
	subscribe(listener: Listener<This, Args>): Promise<SubscriptionHandle>;

	/**
	 * Unsubscribe a previously subscribed listener.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   promise that resolves when unsubscribe is done, returns `true` if
	 *   the listener was actually registered
	 */
	unsubscribe(listener: Listener<This, Args>): Promise<boolean>;

	/**
	 * Subscribe to an event but only trigger the listener once.
	 *
	 * @returns
	 *   promise that will resolve when event is emitted
	 */
	once(): Promise<Args>;
}
