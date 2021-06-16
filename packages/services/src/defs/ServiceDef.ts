import { ServiceEventDef } from './ServiceEventDef';
import { ServiceMethodDef } from './ServiceMethodDef';

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
