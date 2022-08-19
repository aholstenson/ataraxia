import { DataType } from './DataType.js';

/**
 * Parameter definition used in {@link ServiceMethodContract} and {@link ServiceEventContract}.
 */
export interface ServiceParameterContract {
	/**
	 * The name of the parameter.
	 */
	name: string;

	/**
	 * The type of the parameter.
	 */
	type: DataType<any>;

	/**
	 * Description of this parameter.
	 */
	description?: string;

	/**
	 * Get if the parameter is optional.
	 */
	optional: boolean;

	/**
	 * If the parameter represents rest parameters.
	 */
	rest: boolean;
}
