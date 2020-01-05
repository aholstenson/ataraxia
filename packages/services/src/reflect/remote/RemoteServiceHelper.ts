export interface RemoteServiceHelper {
	/**
	 * Call the given method.
	 *
	 * @param method
	 * @param args
	 */
	call(method: string, args: any[]): Promise<any>;

	/**
	 * Request to receive emits of the specified event.
	 *
	 * @param event
	 * @param handler
	 */
	requestSubscribe(event: string): Promise<any>;

	/**
	 * Request to no longer receive emits of the specified event.
	 *
	 * @param event
	 */
	requestUnsubscribe(event: string): Promise<any>;
}
