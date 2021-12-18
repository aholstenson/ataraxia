import { ServiceParameterDef } from './ServiceParameterDef.js';

/**
 * Method definition for a service.
 */
export interface ServiceMethodDef {
	/**
	 * The name of the method.
	 */
	name: string;

	/**
	 * Type identifier for data returned.
	 */
	returnType: string;

	/**
	 * Optional description of the method.
	 */
	description?: string;

	/**
	 * Parameters of the method.
	 */
	parameters: ReadonlyArray<ServiceParameterDef>;
}
