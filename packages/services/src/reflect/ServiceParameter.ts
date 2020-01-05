/**
 * Information about an parameter that can be passed to a method when called.
 */
export interface ServiceParameter {
	/**
	 * The name of the parameter if available.
	 */
	name?: string;

	/**
	 * The type identifier of the parameter if available.
	 */
	typeId?: string;

	/**
	 * If the parameter represents rest parameters.
	 */
	rest: boolean;
}
