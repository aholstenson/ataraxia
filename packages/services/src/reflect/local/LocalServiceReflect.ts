import { Listener } from 'atvik';

import { LocalService } from '../../LocalService';
import { ServiceReflect } from '../ServiceReflect';

import { createLocalServiceMetadata } from './createLocalServiceMetadata';
import { LocalServiceEvent } from './LocalServiceEvent';

/**
 * Implementation of `ServiceReflect` for local services. This implementation
 * will call methods and subscribe to events directly on the object it is
 * created for.
 */
export class LocalServiceReflect extends ServiceReflect {
	private service: LocalService;

	public constructor(
		service: LocalService
	) {
		const { methods, events } = createLocalServiceMetadata(service);

		super(service.id, methods, events);

		this.service = service;
	}

	public apply(method: string, args: any[]): Promise<any> {
		const func = this.service[method];
		if(typeof func !== 'function') {
			return Promise.reject(new Error('Method ' + method + ' does not exist'));
		}

		return Promise.resolve(func.apply(this.service, args));
	}

	/**
	 * Get information about an event and the property at which the event
	 * belongs on the object.
	 *
	 * @param event
	 */
	private getPropertyForEvent(event: string) {
		const eventData = this.getEvent(event);
		if(! eventData) return null;

		return (eventData as LocalServiceEvent).property;
	}

	public subscribe(event: string, listener: Listener<void, any[]>): Promise<void> {
		const property = this.getPropertyForEvent(event);
		if(! property) {
			return Promise.reject(new Error('Event `' + event + '` does not exist'));
		}

		const p = this.service[property];
		p.subscribe(listener);

		return Promise.resolve();
	}

	public unsubscribe(event: string, listener: Listener<void, any[]>): Promise<boolean> {
		const property = this.getPropertyForEvent(event);
		if(! property) {
			return Promise.resolve(false);
		}

		const p = this.service[property];
		return Promise.resolve(p.unsubscribe(listener));
	}
}
