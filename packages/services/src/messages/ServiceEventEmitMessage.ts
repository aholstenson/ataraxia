/**
 * Message sent to other nodes when a service on the local node emits an event.
 */
export interface ServiceEventEmitMessage {
	/**
	 * Service this event is being emitted for.
	 */
	readonly service: string;

	/**
	 * The event being emitted.
	 */
	readonly event: string;

	/**
	 * Arguments to pass to the event.
	 */
	readonly arguments: ReadonlyArray<any>;
}
