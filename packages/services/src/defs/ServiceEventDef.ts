import { ServiceParameterDef } from './ServiceParameterDef.js';

/**
 * Event definition for a service.
 */
export interface ServiceEventDef {
	/**
	 * The name of the event.
	 */
	name: string;

	/**
	 * Optional description of the event.
	 */
	description?: string;

	/**
	 * Parameters of the event.
	 */
	parameters: ReadonlyArray<ServiceParameterDef>;
}
