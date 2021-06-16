/**
 * Parameter definition used in {@link ServiceMethodDef} and {@link ServiceEventDef}.
 */
export interface ServiceParameterDef {
	/**
	 * The name of the parameter if available.
	 */
	name: string;

	/**
	 * The type identifier of the parameter if available.
	 */
	type: string;

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
