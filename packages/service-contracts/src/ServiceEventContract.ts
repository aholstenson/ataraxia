import { ServiceParameterContract } from './ServiceParameterContract';

/**
 * Event contract for a service.
 */
export interface ServiceEventContract {
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
	parameters: ReadonlyArray<ServiceParameterContract>;
}
