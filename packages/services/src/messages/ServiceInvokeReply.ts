/**
 * Reply from a service invocation.
 */
export interface ServiceInvokeReply {
	/**
	 * Identifier of the invocation.
	 */
	id: number;

	/**
	 * The result of the invocation, if no error was raised.
	 */
	result?: any;

	/**
	 * Error raised during invocation.
	 */
	error?: string;
}
