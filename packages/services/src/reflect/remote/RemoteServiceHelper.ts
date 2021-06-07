/**
 * Helper used to actually perform remote calls.
 */
export interface RemoteServiceHelper {
	/**
	 * Call the given method.
	 *
	 * @param method -
	 *   method to call
	 * @param args -
	 *   arguments to call method with
	 */
	call(method: string, args: any[]): Promise<any>;

	/**
	 * Request to receive emits of the specified event.
	 *
	 * @param event -
	 *   event to subscribe to
	 */
	requestSubscribe(event: string): Promise<any>;

	/**
	 * Request to no longer receive emits of the specified event.
	 *
	 * @param event -
	 *   event to unsubscribe from
	 */
	requestUnsubscribe(event: string): Promise<any>;
}
