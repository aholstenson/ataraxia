import {
	AsyncSubscribable,
	AsyncSubscriptionHandle,
	createAsyncSubscribable,
	Event,
	Listener,
	Subscribable,
	SubscriptionHandle
} from 'atvik';

import { BasicValue, ServiceContract, ServiceEventContract, ServiceParameterContract } from 'ataraxia-service-contracts';

import { ServiceEventDef } from './defs/ServiceEventDef.js';
import { ServiceMethodDef } from './defs/ServiceMethodDef.js';
import { ServiceParameterDef } from './defs/ServiceParameterDef.js';
import { MergedServiceReflect } from './reflect/MergedServiceReflect.js';
import { ServiceReflect } from './reflect/ServiceReflect.js';
import { Service } from './Service.js';
import { Services } from './Services.js';

/**
 * Implementation of {@link Service}.
 */
export class ServiceImpl implements Service {
	public readonly id: string;

	private readonly reflect: () => MergedServiceReflect;

	private readonly availableEvent: Event<this>;
	private readonly unavailableEvent: Event<this>;
	private readonly updateEvent: Event<this>;

	public constructor(
		services: Services,
		id: string,
		reflect: () => MergedServiceReflect
	) {
		this.id = id;
		this.reflect = reflect;

		this.availableEvent = new Event(this);
		bridgeEvents(id, services.onServiceAvailable, this.availableEvent);

		this.unavailableEvent = new Event(this);
		bridgeEvents(id, services.onServiceUnavailable, this.unavailableEvent);

		this.updateEvent = new Event(this);
		bridgeEvents(id, services.onServiceUpdate, this.updateEvent);
	}

	public get available() {
		return this.reflect().hasReflects();
	}

	public get onAvailable() {
		return this.availableEvent.subscribable;
	}

	public get onUnavailable() {
		return this.unavailableEvent.subscribable;
	}

	public get onUpdate() {
		return this.updateEvent.subscribable;
	}

	public as<T extends object>(contract: ServiceContract<T>): T {
		const cache = new Map<string, any>();
		const reflect = this.reflect;
		return new Proxy<T>({} as any, {
			get(obj, name, receiver) {
				if(typeof name !== 'string') {
					return undefined;
				}

				let handler = cache.get(name);
				if(handler) return handler;

				const event = contract.getEvent(name);
				if(event) {
					handler = createEventBridge(receiver, reflect, event);

					cache.set(name, handler);
					return handler;
				}

				// Look for a method
				const method = contract.getMethod(name);
				if(method) {
					const paramTypes = method.parameters.map(p => p.type);
					const resultType = method.returnType;

					handler = async (...args: any[]) => {
						const convertedArgs: any[] = [];
						for(let i = 0; i < paramTypes.length; i++) {
							const arg = args[i];
							convertedArgs[i] = typeof arg === 'undefined'
								? undefined
								: paramTypes[i].toBasic(arg);
						}

						const result = await reflect().apply(name, convertedArgs);
						return resultType.fromBasic(result);
					};

					cache.set(name, handler);
					return handler;
				}

				return undefined;
			}
		});
	}

	public matches(contract: ServiceContract<any>): boolean {
		// Check that all methods in the contract are present
		for(const method of contract.methods) {
			const def = this.getMethod(method.name);
			if(! def) return false;

			// Verify the return type
			if(def.returnType !== method.returnType.id) {
				return false;
			}

			// Verify the parameter types
			if(! checkParameterTypes(method.parameters, def.parameters)) {
				return false;
			}
		}

		// Check that all events in the contract are present
		for(const event of contract.events) {
			const def = this.getEvent(event.name);
			if(! def) return false;

			// Verify the parameter types
			if(! checkParameterTypes(event.parameters, def.parameters)) {
				return false;
			}
		}

		return true;
	}

	public apply(method: string, args: ReadonlyArray<BasicValue>): Promise<BasicValue> {
		return this.reflect().apply(method, args);
	}

	public call(method: string, ...args: ReadonlyArray<BasicValue>): Promise<BasicValue> {
		return this.reflect().call(method, ...args);
	}

	public getMethod(name: string): ServiceMethodDef | null {
		return this.reflect().getMethod(name);
	}

	public hasMethod(name: string): boolean {
		return this.reflect().hasMethod(name);
	}

	public get methods(): ServiceMethodDef[] {
		return this.reflect().methods;
	}

	public subscribe(event: string, listener: Listener<void, BasicValue[]>): Promise<AsyncSubscriptionHandle> {
		return this.reflect().subscribe(event, listener);
	}

	public unsubscribe(event: string, listener: Listener<void, BasicValue[]>): Promise<boolean> {
		return this.reflect().unsubscribe(event, listener);
	}

	public getEvent(name: string): ServiceEventDef | null {
		return this.reflect().getEvent(name);
	}

	public hasEvent(name: string): boolean {
		return this.reflect().hasEvent(name);
	}

	public get events(): ServiceEventDef[] {
		return this.reflect().events;
	}
}

function createEventBridge<T>(
	instance: T,
	reflect: () => ServiceReflect,
	contract: ServiceEventContract
): AsyncSubscribable<T, any[]> {
	const event = new Event<T, any[]>(instance);
	let handle: AsyncSubscriptionHandle | undefined;

	return createAsyncSubscribable({
		async subscribe(listener) {
			event.subscribe(listener);

			if(! handle) {
				handle = await reflect().subscribe(contract.name, (...args: BasicValue[]) => {
					const params = contract.parameters;
					const convertedArgs: any[] = [];
					for(let i = 0; i < params.length; i++) {
						const arg = args[i];
						convertedArgs[i] = typeof arg === 'undefined'
							? undefined
							: params[i].type.fromBasic(arg);
					}

					event.emit(...convertedArgs);
				});
			}
		},

		async unsubscribe(listener) {
			event.unsubscribe(listener);

			if(! event.hasListeners) {
				await handle?.unsubscribe();
				handle = undefined;
			}
		}
	});
}

/**
 * Check that parameters defined by a contract matches the ones in a
 * definition.
 *
 * @param p1 -
 *   contract side parameters
 * @param p2 -
 *   definition side parameters
 * @returns
 *   `true` if everything matches
 */
function checkParameterTypes(
	p1: ReadonlyArray<ServiceParameterContract>,
	p2: ReadonlyArray<ServiceParameterDef>
): boolean {
	const n = Math.max(p1.length, p2.length);
	for(let i = 0; i < n; i++) {
		const param1 = p1[i];
		const param2 = p2[i];

		if(param1 && param2) {
			// Both parameters present, check types
			if(param1.type.id !== param2.type) {
				return false;
			}

			// Optional flag should be the same
			if(param1.optional !== param2.optional) {
				return false;
			}
		} else if(param1) {
			// Only param1 exists - make sure its optional
			if(! param1.optional) {
				return false;
			}
		} else if(param2) {
			// Only param2 exists - make sure its optional
			if(! param2.optional) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Bridge events from one subscribable to another if the service identifier
 * matches.
 *
 * @param id -
 *   id to look for
 * @param parentEvent -
 *   subscribable to bridge from
 * @param event -
 *   event to emit on
 */
function bridgeEvents(
	id: string,
	parentEvent: Subscribable<any, [ Service ]>,
	event: Event<any>
) {
	let handle: SubscriptionHandle | undefined;
	event.monitorListeners(() => {
		if(event.hasListeners) {
			if(! handle) {
				// Listeners, but no subscription on parent event - subscribe
				handle = parentEvent.subscribe(service => {
					if(service.id === id) {
						event.emit();
					}
				});
			}
		} else {
			if(handle) {
				// No listeners, but subscription active - unsubscribe
				handle.unsubscribe();
				handle = undefined;
			}
		}
	});
}
