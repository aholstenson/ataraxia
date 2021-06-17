/**
 * Message containing data intended for a certain peer.
 */
export interface DataMessage {
	/**
	 * The current path of the message. Every node this message passes through
	 * appends to this path.
	 */
	readonly path: DataMessagePathEntry[];

	/**
	 * The target node that this message is for.
	 */
	readonly target: ArrayBuffer;

	/**
	 * Type of data being sent.
	 */
	readonly type: string;

	/**
	 * Data of the message.
	 */
	readonly data: ArrayBuffer;
}

/**
 * Path entry.
 */
export interface DataMessagePathEntry {
	/**
	 * The identifier of the node that added this path entry.
	 */
	readonly node: ArrayBuffer;

	/**
	 * An identifier used by the node to identify this message.
	 */
	readonly id: number;
}

/**
 * Message sent backwards when the target node acknowledges having received
 * the message.
 */
export interface DataAckMessage {
	id: number;
}

/**
 * Message sent backwards if a node rejects the message.
 */
export interface DataRejectMessage {
	id: number;
}
