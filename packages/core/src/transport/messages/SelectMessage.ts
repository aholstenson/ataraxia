/**
 * Message sent by a client to the server to announce their identifier and
 * what capabilities it has picked from the initial HELLO.
 */
export interface SelectMessage {
	/**
	 * The identifier of the client.
	 */
	id: ArrayBuffer;

	/**
	 * The capabilities picked.
	 */
	capabilities: Set<string>;
}
