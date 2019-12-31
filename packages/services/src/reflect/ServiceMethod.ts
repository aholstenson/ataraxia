import { ServiceMethodParameter } from './ServiceMethodParameter';

/**
 * Method as defined by a service.
 */
export interface ServiceMethod {
	/**
	 * The name of the method.
	 */
	readonly name: string;

	/**
	 * Information about the parameters of the method.
	 */
	readonly parameters: ReadonlyArray<ServiceMethodParameter>;
}
