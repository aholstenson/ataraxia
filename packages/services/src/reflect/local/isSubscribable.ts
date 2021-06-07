import { Subscribable } from 'atvik';

/**
 * Determine if the given object can be subscribed to.
 *
 * @param o -
 *   object to check
 * @returns
 *   if an object could be considered a `Subscribable`
 */
export function isSubscribable(o: any): o is Pick<Subscribable<any>, 'subscribe' | 'unsubscribe'> {
	if(! o) return false;

	return typeof o.subscribe === 'function'
		&& typeof o.unsubscribe === 'function';
}
