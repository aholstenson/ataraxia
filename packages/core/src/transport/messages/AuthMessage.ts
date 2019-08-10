/**
 * Message to select the initial authentication method.
 */
export interface AuthMessage {
	/**
	 * The authentication method to use.
	 */
	readonly method: string;

	/**
	 * Data associated with the method.
	 */
	readonly data: ArrayBuffer;
}
