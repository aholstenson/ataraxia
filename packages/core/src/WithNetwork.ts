/**
 * Interface used for things that are tied to a network, such as transports.
 */
export interface WithNetwork {
	/**
	 * The identifier of the current node within the network.
	 */
	readonly networkIdBinary: ArrayBuffer;

	/**
	 * Identifier of this node as a string.
	 */
	readonly networkId: string;

	/**
	 * The debug namespace.
	 */
	readonly debugNamespace: string;
}
