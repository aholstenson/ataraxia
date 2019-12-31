import { ServiceReflect } from './reflect/ServiceReflect';

/**
 * Symbol used to store access to the ServiceReflect API.
 */
export const serviceReflect = Symbol('serviceReflect');

/**
 * API available for all services.
 */
export interface Service {
	/**
	 * Identifier of the service.
	 */
	id: string;

	/**
	 * Inspect and call methods on this service.
	 */
	[serviceReflect]: ServiceReflect;
}
