import { ServiceEventDef } from './ServiceEventDef.js';
import { ServiceMethodDef } from './ServiceMethodDef.js';

/**
 * Definition of a service.
 */
export interface ServiceDef {
	/**
	 * Identifier of this service.
	 */
	readonly id: string;

	/**
	 * Methods on the service that are callable.
	 */
	readonly methods: ReadonlyArray<ServiceMethodDef>;

	/**
	 * Events on the service that can be listened to.
	 */
	readonly events: ReadonlyArray<ServiceEventDef>;
}
