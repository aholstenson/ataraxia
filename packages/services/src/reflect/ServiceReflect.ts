import { Listener } from 'atvik';

import { ServiceEvent } from './ServiceEvent';
import { ServiceMethod } from './ServiceMethod';

/**
 * API for reflection on a service, allows for calling methods in a generic
 * way and also for inspecting methods and their arguments.
 */
export abstract class ServiceReflect {
	/**
	 * Identifier of the service this reflect is for.
	 */
	public readonly id: string;

	protected _methods: Map<string, ServiceMethod>;
	protected _events: Map<string, ServiceEvent>;

	protected constructor(
		id: string,
		methods: Map<string, ServiceMethod>,
		events: Map<string, ServiceEvent>,
	) {
		this.id = id;
		this._methods = methods;
		this._events = events;
	}

	/**
	 * Call a method on this service passing the arguments as an array.
	 *
	 * @param method
	 *   the method to call
	 * @param args
	 *   the arguments to pass to the method
	 */
	public abstract apply(method: string, args: ReadonlyArray<any[]>): Promise<any>;

	/**
	 * Call a method on this service passing.
	 *
	 * @param method
	 *   the method to call
	 * @param args
	 *   the arguments to pass to the method
	 */
	public call(method: string, ...args: ReadonlyArray<any[]>): Promise<any> {
		return this.apply(method, args);
	}

	/**
	 * Get the definition for the given method.
	 *
	 * @param method
	 *   name of the method
	 */
	public getMethod(name: string) {
		return this._methods.get(name) || null;
	}

	/**
	 * Check if a certain method is available.
	 *
	 * @param method
	 *   method to check
	 */
	public hasMethod(name: string) {
		return this._methods.has(name);
	}

	/**
	 * Get methods available for this service.
	 */
	public get methods() {
		return [ ...this._methods.values() ];
	}

	/**
	 * Subscribe to an event.
	 *
	 * @param event
	 * @param listener
	 */
	public abstract subscribe(event: string, listener: Listener<void, any[]>): Promise<void>;

	/**
	 * Unsubscribe from an event.
	 *
	 * @param event
	 * @param listener
	 */
	public abstract unsubscribe(event: string, listener: Listener<void, any[]>): Promise<boolean>;

	/**
	 * Get if a specific event is available for this service.
	 *
	 * @param event
	 */
	public getEvent(name: string) {
		return this._events.get(name) || null;
	}

	/**
	 * Get the definition for a specific event.
	 *
	 * @param event
	 */
	public hasEvent(name: string) {
		return this._events.has(name);
	}

	/**
	 * Get the events available for this service.
	 */
	public get events() {
		return [ ...this._events.values() ];
	}
}
