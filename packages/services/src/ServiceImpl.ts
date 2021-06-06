import { Listener } from 'atvik';

import { ServiceReflect } from './reflect';
import { MergedServiceReflect } from './reflect/MergedServiceReflect';
import { serviceReflect } from './Service';
import { Subscribable } from './Subscribable';
import { SubscriptionHandle } from './SubscriptionHandle';

export class ServiceImpl {
	public readonly id: string;
	public readonly proxy: any;

	private readonly reflect: MergedServiceReflect;

	public constructor(id: string) {
		this.id = id;
		this.reflect = new MergedServiceReflect(id);

		const self = this;
		const cache = new Map<string, any>();
		this.proxy = new Proxy({}, {
			get(obj, name) {
				if(name === 'id') {
					return self.id;
				} else if(name === serviceReflect) {
					return self.reflect;
				} else if(typeof name === 'string') {
					let handler = cache.get(name);
					if(handler) return handler;

					if(name.startsWith('on')) {
						// Assume this is an event, but only if the event exists
						const eventName = name[2].toLowerCase() + name.substring(3);
						if(self.reflect.hasEvent(eventName)) {
							handler = createSubscribable(self.proxy, self.reflect, eventName);
						}
					}

					// Default to invoking a method
					if(! handler) {
						handler = (...args: any[]) => self.reflect.apply(name, args);
					}

					cache.set(name, handler);
					return handler;
				} else {
					return undefined;
				}
			}
		});
	}

	public addReflect(reflect: ServiceReflect) {
		this.reflect.addReflect(reflect);
	}

	public removeReflect(reflect: ServiceReflect) {
		this.reflect.removeReflect(reflect);
	}

	public hasReflects() {
		return this.reflect.hasReflects();
	}
}

/**
 * Create a `Subscribable` for an event that will delegate the subscription
 * to the `ServiceReflect` while also rewriting the .
 *
 * @param self
 * @param reflect
 * @param event
 */
function createSubscribable(
	self: any,
	reflect: ServiceReflect,
	event: string
): Subscribable<any, any[]> {
	const listenerMapping = new Map<Listener<any, any[]>, Listener<void, any[]>>();

	const unsubscribe = async (listener: Listener<any, any[]>): Promise<boolean> => {
		const actual = listenerMapping.get(listener);
		if(actual) {
			listenerMapping.delete(listener);
			return reflect.unsubscribe(event, actual);
		} else {
			return false;
		}
	};

	const subscribe = async (listener: Listener<any, any[]>): Promise<SubscriptionHandle> => {
		const actualListener = listener.bind(self);
		listenerMapping.set(listener, actualListener);
		await reflect.subscribe(event, actualListener);

		return {
			async unsubscribe(): Promise<void> {
				await unsubscribe(actualListener);
			}
		};
	};

	subscribe.subscribe = subscribe;
	subscribe.unsubscribe = unsubscribe;
	subscribe.once = () => new Promise<any[]>(resolve => {
		const listener = (...args: any[]) => {
			unsubscribe(listener);

			resolve(args);
		};

		subscribe(listener);
	});

	return subscribe;
}
