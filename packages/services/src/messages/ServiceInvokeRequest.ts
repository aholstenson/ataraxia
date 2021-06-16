/**
 * Request to invoke a method.
 */
export interface ServiceInvokeRequest {
	/**
	 * Id of the invocation.
	 */
	readonly id: number;

	/**
	 * Service to invoke method on.
	 */
	readonly service: string;
	/**
	 * Method to invoke.
	 */
	readonly method: string;
	/**
	 * Arguments to pass to method.
	 */
	readonly arguments: ReadonlyArray<any>;
}
