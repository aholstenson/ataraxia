import { ServiceMethod } from './ServiceMethod';

/**
 * API for reflection on a service, allows for calling methods in a generic
 * way and also for inspecting methods and their arguments.
 */
export interface ServiceReflect {
	/**
	 * Identifier of the service this reflect is for.
	 */
	readonly id: string;

	/**
	 * Call a method on this service passing the arguments as an array.
	 *
	 * @param method
	 *   the method to call
	 * @param args
	 *   the arguments to pass to the method
	 */
	apply(method: string, args: ReadonlyArray<any>): Promise<any>;

	/**
	 * Call a method on this service passing.
	 *
	 * @param method
	 *   the method to call
	 * @param args
	 *   the arguments to pass to the method
	 */
	call(method: string, ...args: ReadonlyArray<any>): Promise<any>;

	/**
	 * Check if a certain method is available.
	 *
	 * @param method
	 *   method to check
	 */
	hasMethod(method: string): boolean;

	/**
	 * Get the definition for the given method.
	 *
	 * @param method
	 *   name of the method
	 */
	getMethod(method: string): ServiceMethod | null;

	/**
	 * Get methods available for this service.
	 */
	readonly methods: ServiceMethod[];
}
