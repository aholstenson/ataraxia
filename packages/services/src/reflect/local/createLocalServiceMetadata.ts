import { ServiceEvent } from '../ServiceEvent';
import { ServiceMethod } from '../ServiceMethod';

import { isSubscribable } from './isSubscribable';
import { LocalServiceEvent } from './LocalServiceEvent';

/**
 * Create the metadata for the given object, this will inspect the object,
 * locating the methods and events for it.
 *
 * @param object -
 *   instance to create metadata for
 * @returns
 *   object with methods and events
 */
export function createLocalServiceMetadata(object: any) {
	const methods: Map<string, ServiceMethod> = new Map();
	const events: Map<string, ServiceEvent> = new Map();

	while(object) {
		for(const key of Object.getOwnPropertyNames(object)) {
			const value = object[key];

			if(isSubscribable(value)) {
				/*
				 * If this can be treated as a subscribable, meaning there is a
				 * subscribe and unsubscribe function we treat it as an event.
				 */
				let name = key;
				if(name.startsWith('on')) {
					name = name[2].toLowerCase() + name.substring(3);
				}

				if(events.has(name)) continue;

				const event: LocalServiceEvent = {
					name: name,
					property: key,
					parameters: [
						{
							rest: true
						}
					]
				};

				events.set(name, event);
			} else {
				// Methods are always functions, so skip anything that isn't a function
				if(typeof value !== 'function') continue;

				// If the name starts with _ or already exists skip it
				if(key[0] === '_' || methods.has(key)) continue;

				const method: ServiceMethod = {
					name: key,
					parameters: [
						{
							rest: true
						}
					]
				};

				methods.set(key, method);
			}
		}

		object = Object.getPrototypeOf(object);
	}

	return {
		methods,
		events
	};
}
