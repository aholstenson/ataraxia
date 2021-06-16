import { AsyncSubscriptionHandle, Listener, Subscribable } from 'atvik';

import { BasicValue, ServiceContract } from 'ataraxia-service-contracts';

import { ServiceEventDef } from './defs/ServiceEventDef';
import { ServiceMethodDef } from './defs/ServiceMethodDef';

/**
 * Service that may be callable somewhere in the network. Provides utilities
 * to listen for availability, retrieve metadata about methods and events and
 * to cast it to a proxy based on a contract.
 */
export interface Service {
	/**
	 * Identifier of the service.
	 */
	readonly id: string;

	/**
	 * If a service with this id is currently available. To listen for changes
	 * in availability use {@link onAvailable} and {@link onUnavailable}.
	 */
	readonly available: boolean;

	/**
	 * Event emitted when this service becomes available.
	 *
	 * ```javascript
	 * service.onAvailable(() => console.log('Service is now available'));
	 * ```
	 */
	readonly onAvailable: Subscribable<this>;

	/**
	 * Event emitted when this service becomes unavailable.
	 *
	 * ```javascript
	 * service.onUnavailable(() => console.log('Service is no longer available'));
	 * ```
	 */
	readonly onUnavailable: Subscribable<this>;

	/**
	 * Event emitted when this service is updated. This can be either that it
	 * has become available or unavailable, or that the contract supported is
	 * now different.
	 *
	 * Contracts may change if a service is registered multiple times in the
	 * network.
	 *
	 * ```javascript
	 * service.onUpdate(() => {
	 *   // Check if this service still matches our needs
	 * });
	 * ```
	 */
	readonly onUpdate: Subscribable<this>;

	/**
	 * Get a version of the service that implements the given contract and that
	 * can be easily invoked.
	 *
	 * ```javascript
	 * const EchoService = new ServiceContract()
	 *   .defineMethod('echo', {
	 *     returnType: stringType,
	 *     parameters: [
	 *       {
	 *          name: 'message',
	 *          type: stringType
	 *       }
	 *     ]
	 *   });
	 *
	 * // Implement the contract for us
	 * const proxied = service.as(EchoService);
	 *
	 * // Invoke methods on the proxied object
	 * const result = await proxied.echo('message to echo');
	 * ```
	 *
	 * @param contract -
	 *   contract of the service
	 * @returns
	 *   proxy for the contract
	 */
	as<T extends object>(contract: ServiceContract<T>): T;

	/**
	 * Check if the service as it is seen currently matches the given contract.
	 *
	 * @param contract -
	 *   contract to check
	 * @returns
	 *   if the service matches
	 */
	matches(contract: ServiceContract<any>): boolean;

	/**
	 * Call a method on this service passing the arguments as an array.
	 *
	 * ```javascript
	 * const result = await service.apply('echo', [ 'arg1' ]);
	 * ```
	 *
	 * @param method -
	 *   the method to call
	 * @param args -
	 *   the arguments to pass to the method
	 * @returns
	 *   promise that resolves with the result of the call or rejects if an
	 *   error occurs
	 */
	apply(method: string, args: ReadonlyArray<BasicValue>): Promise<BasicValue>;

	/**
	 * Call a method on this service passing the arguments as rest parameters.
	 *
	 * ```javascript
	 * const result = await service.call('echo', 'arg1');
	 * ```
	 *
	 * @param method -
	 *   the method to call
	 * @param args -
	 *   the arguments to pass to the method
	 * @returns
	 *   promise that resolves with the result of the call or rejects if an
	 *   error occurs
	 */
	call(method: string, ...args: ReadonlyArray<BasicValue>): Promise<BasicValue>;

	/**
	 * Get the definition for the given method.
	 *
	 * @param name -
	 *   name of the method
	 * @returns
	 *   information about method if found, `null` otherwise
	 */
	getMethod(name: string): ServiceMethodDef | null;

	/**
	 * Check if a certain method is available.
	 *
	 * @param name -
	 *   method to check
	 * @returns
	 *   `true` if the method is available
	 */
	hasMethod(name: string): boolean;

	/**
	 * Get methods available for this service.
	 *
	 * @returns
	 *   array with methods
	 */
	readonly methods: ServiceMethodDef[];

	/**
	 * Subscribe to an event.
	 *
	 * @param event -
	 *   name of event
	 * @param listener -
	 *   listener to subscribe
	 * @returns
	 *   promise with subscription handle, resolves when the listener is
	 *   fully subscribed
	 */
	subscribe(event: string, listener: Listener<void, BasicValue[]>): Promise<AsyncSubscriptionHandle>;

	/**
	 * Unsubscribe from an event.
	 *
	 * @param event -
	 *   name of event
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   promise that resolves when the listener is unsubscribed
	 */
	unsubscribe(event: string, listener: Listener<void, BasicValue[]>): Promise<boolean>;

	/**
	 * Get information about an available event.
	 *
	 * @param name -
	 *   name of the event
	 * @returns
	 *   event if available or `null` if event doesn't exist
	 */
	getEvent(name: string): ServiceEventDef | null;

	/**
	 * Check if a specific event is available.
	 *
	 * @param name -
	 *   name of the event
	 * @returns
	 *   `true` if the event exists
	 */
	hasEvent(name: string): boolean;

	/**
	 * Get the events available for this service.
	 *
	 * @returns
	 *   array with available events
	 */
	readonly events: ServiceEventDef[];
}
