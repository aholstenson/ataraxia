import { DataType } from './DataType.js';
import { ServiceParameterContract } from './ServiceParameterContract.js';

/**
 * Method contract for a service.
 */
export interface ServiceMethodContract {
	/**
	 * The name of the method.
	 */
	name: string;

	/**
	 * Type identifier for data returned.
	 */
	returnType: DataType<any>;

	/**
	 * Optional description of the method.
	 */
	description?: string;

	/**
	 * Parameters of the method.
	 */
	parameters: ReadonlyArray<ServiceParameterContract>;
}
