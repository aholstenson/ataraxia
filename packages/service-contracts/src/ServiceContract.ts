import { AsyncSubscribable } from 'atvik';

import { DataType } from './DataType.js';
import { ServiceEventContract } from './ServiceEventContract.js';
import { ServiceMethodContract } from './ServiceMethodContract.js';
import { ServiceParameterContract } from './ServiceParameterContract.js';

const contractMarker = Symbol('serviceContract');

/**
 * Contract for a service, defines methods that can be invoked and events that
 * can be listened to.
 *
 * ```javascript
 * const EchoService = new ServiceContract()
 *   .defineMethod('echo', {
 *      returnType: stringType,
 *      parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *      ]
 *   });
 * ```
 *
 * For TypeScript contracts are typed and can be used with interfaces to help
 * guide in their definition:
 *
 * ```typescript
 * interface EchoService {
 *   echo(message: string): Promise<string>;
 * }
 *
 * const EchoService = new ServiceContract<EchoService>()
 *   .defineMethod('echo', {
 *      returnType: stringType,
 *      parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *      ]
 *   });
 * ```
 *
 * ## Defining methods
 *
 * Methods are defined with {@link defineMethod} and need to provide the name
 * of the method, its return type and parameters.
 *
 * For methods that return nothing {@link voidType} should be used:
 *
 * ```javascript
 * .defineMethod('methodWithoutReturnValue', {
 *   returnType: voidType,
 *   parameters: []
 * })
 * ```
 *
 * ## Defining events
 *
 * Events are defined with {@link defineEvent} and should provide information
 * about the parameters the event emits. For implementations `AsyncEvent` is
 * assumed to be used.
 *
 * ```javascript
 * const contract = new ServiceContract()
 *   .defineEvent('onEcho', {
 *     parameters: [
 *       {
 *         name: 'message',
 *         type: stringType
 *       }
 *     ]
 *   });
 *
 * class Impl {
 *   constructor() {
 *     this.echoEvent = new AsyncEvent(this);
 *   }
 *
 *   get onEcho() {
 *     return this.echoEvent.subscribable;
 *   }
 * }
 * ```
 *
 * ## Using contracts
 *
 * When using classes the recommended way to mark what contract a class
 * implements is to use the {@link serviceContract} decorator:
 *
 * ```javascript
 * @serviceContract(EchoService)
 * class EchoServiceImpl {
 *   async echo(message) {
 *      return message;
 *   }
 * }
 * ```
 *
 * If the decorator is not used you can define a static property called
 * `serviceContract` instead:
 *
 * ```javascript
 * class EchoServiceImpl {
 *   static serviceContract = EchoService;
 *
 *   async echo(message) {
 *      return message;
 *   }
 * }
 * ```
 *
 * Contracts will traverse the prototype chain, so defining contract on
 * extended classes work well:
 *
 * ```javascript
 * @serviceContract(EchoService)
 * class AbstractEchoService {
 *   async echo(message) {
 *      return message;
 *   }
 * }
 *
 * class EchoServiceImpl extends AbstractEchoService {
 * }
 * ```
 *
 * For plain objects the easiest way to use a contract is to use
 * {@link implement}:
 *
 * ```javascript
 * const instance = EchoService.implement({
 *   async echo(message) {
 *     return message;
 *   }
 * });
 * ```
 *
 * As with classes a property may be used instead:
 *
 * ```javascript
 * const instance = {
 *   serviceContract: EchoService,
 *
 *   async echo(message) {
 *     return message;
 *   }
 * };
 * ```
 */
export class ServiceContract<T extends object> {
	private readonly _methods: ReadonlyMap<string, ServiceMethodContract>;
	private readonly _events: ReadonlyMap<string, ServiceEventContract>;

	public constructor(
		methods: ReadonlyMap<string, ServiceMethodContract> = new Map(),
		events: ReadonlyMap<string, ServiceEventContract> = new Map()
	) {
		this._methods = methods;
		this._events = events;
	}

	/**
	 * Get all of the methods defined by this contract.
	 *
	 * @returns
	 *   array with methods
	 */
	public get methods(): ReadonlyArray<ServiceMethodContract> {
		return [ ...this._methods.values() ];
	}

	/**
	 * Get the contract for a method via its name.
	 *
	 * @param name -
	 *   name of method
	 * @returns
	 *   contract for method or `null` if method does not exist
	 */
	public getMethod(name: string): ServiceMethodContract | null {
		return this._methods.get(name) ?? null;
	}

	/**
	 * Get all of the events defined by this contract.
	 *
	 * @returns
	 *   array with events
	 */
	public get events(): ReadonlyArray<ServiceEventContract> {
		return [ ...this._events.values() ];
	}

	/**
	 * Get the contract for an event via its name.
	 *
	 * @param name -
	 *   name of event
	 * @returns
	 *   contract for event or `null` if event does not exist
	 */
	public getEvent(name: string): ServiceEventContract | null {
		return this._events.get(name) ?? null;
	}

	/**
	 * Implement this contract using the given handler.
	 *
	 * @param handler -
	 *   object that handles the methods in the contract
	 * @returns
	 *   instance with added marker for the contract
	 */
	public implement(handler: T): T {
		Object.defineProperty(handler, contractMarker, {
			value: this,
			writable: false,
			enumerable: false
		});
		return handler;
	}

	/**
	 * Merge several contract instances together. Methods and events will be
	 * treated in left to right order, methods/events that are redefined by
	 * contracts later in the array will be checked for compatibility.
	 *
	 * @param instances -
	 *   instances to merge together
	 * @returns
	 *   merged contract
	 */
	public static merge(instances: ServiceContract<any>[]): ServiceContract<any> {
		if(instances.length === 0) {
			throw new Error('No contracts to merge');
		}

		const methods = new Map<string, ServiceMethodContract>();
		const events = new Map<string, ServiceEventContract>();
		for(const instance of instances) {
			for(const method of instance._methods.values()) {
				const existingMethod = methods.get(method.name);
				if(existingMethod) {
					if(method.returnType.id !== existingMethod.returnType.id) {
						throw new Error('Return type of method `' + method.name + '` differs');
					}

					checkParameters('method ' + method.name, existingMethod.parameters, method.parameters);

					if(! existingMethod.description && method.description) {
						// Copy description if not defined
						methods.set(method.name, {
							...existingMethod,
							description: method.description
						});
					}
				} else {
					methods.set(method.name, method);
				}
			}

			for(const event of instance._events.values()) {
				const existingEvent = events.get(event.name);
				if(existingEvent) {
					checkParameters('event ' + event.name, existingEvent.parameters, event.parameters);

					if(! existingEvent.description && event.description) {
						// Copy description if not defined
						events.set(event.name, {
							...existingEvent,
							description: event.description
						});
					}
				} else {
					events.set(event.name, event);
				}
			}
		}

		return new ServiceContract(methods, events);
	}

	/**
	 * Get the service contract a certain object implements. This works for
	 * objects returned for {@link implement} and for objects/classes that
	 * either define their contract in the `serviceContract` property or using
	 * the {@link serviceContract} decorator.
	 *
	 * @param instance -
	 *   instance to get contract for
	 * @returns
	 *   contract as defined by the instance or `null` if no contract is
	 *   available
	 */
	public static get(instance: object): ServiceContract<any> | null {
		const contracts: ServiceContract<any>[] = [];

		// Go through the prototype adding up all the contracts
		let current: { serviceContract?: any; [contractMarker]?: any } = instance;
		while(current) {
			if(current.serviceContract instanceof ServiceContract) {
				contracts.push(current.serviceContract);
			}

			if(current[contractMarker] instanceof ServiceContract) {
				contracts.push(current[contractMarker]);
			}

			current = Object.getPrototypeOf(current);
		}

		// After gathering contracts, either merge or return null
		if(contracts.length === 0) {
			return null;
		} else {
			return this.merge(contracts);
		}
	}

	/**
	 * Describe a method.
	 *
	 * @param name -
	 *   name of the method
	 * @param desc -
	 *   description of the method
	 * @returns
	 *   new instance with method added
	 */
	public describeMethod<
		K extends keyof T & string,
		V extends MethodResult<T[K]>,
		A extends MethodArguments<T[K]>
	>(
		name: K,
		desc: ServiceMethodDescription<V, A>
	): ServiceContract<T> {
		const methods = new Map(this._methods);
		methods.set(name, {
			name: name,
			returnType: desc.returnType,
			description: desc.description,
			parameters: convertParameters(desc.parameters as any)
		});

		return new ServiceContract(methods, this._events);
	}

	/**
	 * Describe an event.
	 *
	 * @param name -
	 *   name of the event
	 * @param desc -
	 *   description of the event
	 * @returns
	 *   new instance with event added
	 */
	public describeEvent<
		K extends keyof T & string,
		A extends EventArguments<T[K]>
	>(
		name: K,
		desc: ServiceEventDescription<A>
	): ServiceContract<T> {
		const events = new Map(this._events);
		events.set(name, {
			name: name,
			description: desc.description,
			parameters: convertParameters(desc.parameters as any)
		});

		return new ServiceContract(this._methods, events);
	}
}

/**
 * Decorator for defining what contract a certain class implements.
 *
 * ```javascript
 * @serviceContract(contractHere)
 * class ServiceImpl {
 *   ...
 * }
 * ```
 *
 * With Typescript the decorator can't validate the type, but it is recommended
 * to implement the same type as the contract was defined with:
 *
 * ```typescript
 * interface EchoService {
 *   echo(message: string): Promise<string>;
 * }
 *
 * const EchoService = new ServiceContract<EchoService>()
 *   .defineMethod('echo', {
 *      returnType: stringType,
 *      parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *      ]
 *   });
 *
 * @serviceContract(EchoService)
 * class EchoServiceImpl implements EchoService {
 *   async echo(message: string) {
 *     return message;
 *   }
 * }
 * ```
 *
 * @param contract -
 *   the contract that is implemented
 * @returns
 *   decorator
 */
export function serviceContract(contract: ServiceContract<any>): ClassDecorator {
	return function(target) {
		Object.defineProperty(target.prototype, contractMarker, {
			value: contract,
			writable: false,
			enumerable: false
		});
	};
}


/**
 * Convert parameters into contract variant.
 *
 * @param params -
 * @returns -
 *   converted parameters
 */
function convertParameters(params: ReadonlyArray<ServiceParamDescription>): ReadonlyArray<ServiceParameterContract> {
	return params.map(v => {
		return {
			name: v.name,
			type: v.type,
			description: v.description,
			optional: v.optional ?? false,
			rest: v.rest ?? false
		};
	});
}

/**
 * Check that parameters defined by a contract matches the ones in a
 * definition.
 *
 * @param err -
 *   short description for error
 * @param p1 -
 *   contract side parameters
 * @param p2 -
 *   definition side parameters
 */
function checkParameters(
	err: string,
	p1: ReadonlyArray<ServiceParameterContract>,
	p2: ReadonlyArray<ServiceParameterContract>
): void {
	const n = Math.max(p1.length, p2.length);
	for(let i = 0; i < n; i++) {
		const param1 = p1[i];
		const param2 = p2[i];

		if(param1 && param2) {
			// Both parameters present, check types
			if(param1.type.id !== param2.type.id) {
				throw new Error(
					'Parameter ' + i + ' for ' + err + ' differs in types, '
					+ 'defined as ' + param1.type.id + ' but wanted to merge with '
					+ param2.type.id
				);
			}

			// Optional flag should be the same
			if(param1.optional !== param2.optional) {
				throw new Error(
					'Parameter ' + i + ' for ' + err + ' is optional in one contract but not the other'
				);
			}
		} else if(param1) {
			// Only param1 exists - make sure its optional
			if(! param1.optional) {
				throw new Error(
					'Parameter ' + i + ' for ' + err + ' is defined as required but doesn\'t exist in other contract'
				);
			}
		} else if(param2) {
			// Only param2 exists - make sure its optional
			if(! param2.optional) {
				throw new Error(
					'Parameter ' + i + ' for ' + err + ' is not defined but other contract requires it'
				);
			}
		}
	}
}

/**
 * Options for a method.
 */
export interface ServiceMethodDescription<R extends any = any, A extends any[] = any[]> {
	/**
	 * The type of data returned by the method.
	 */
	returnType: DataType<R>;

	/**
	 * Short description of the method.
	 */
	description?: string;

	/**
	 * Parameters of the method.
	 */
	parameters: Params<A>;
}

/**
 * Options for an event.
 */
export interface ServiceEventDescription<A extends any[] = any[]> {
	/**
	 * Short description of the event.
	 */
	description?: string;

	/**
	 * Parameters of the event.
	 */
	parameters: Params<A>;
}

/**
 * Options for the parameters of a method or event.
 */
export interface ServiceParamDescription<T = any> {
	/**
	 * The name of the parameter.
	 */
	name: string;

	/**
	 * The type of the parameter.
	 */
	type: DataType<T>;

	/**
	 * Description of this parameter.
	 */
	description?: string;

	/**
	 * If this parameter is optional.
	 */
	optional?: boolean;

	/**
	 * If this parameter is a rest parameter.
	 */
	rest?: boolean;
}

/**
 * Type that extracts the result of a method if it's a Promise<T>.
 */
type MethodResult<T> = T extends (...args: any) => Promise<infer R> ? R : never;

/**
 * Type that extracts the arguments from a method.
 */
type MethodArguments<T> = T extends (...args: infer R) => Promise<any> ? R : never;

/**
 * Type that extracts the arguments of an event listener.
 */
type EventArguments<T> = T extends AsyncSubscribable<any, infer R> ? R : never;

/**
 * Recursive type to turn a tuple of one type into a tuple of `ServiceArg`.
 * Changes something such as `[ string, number ]` into
 * `[ ServiceArg<string>, ServiceArg<number> ]`.
 */
type ParamsInner<T extends any[]> = T extends []
	? []
	: T extends [ infer H, ...infer R ]
		? [ ServiceParamDescription<H>, ...ParamsInner<R> ]
		: T;

/**
 * Turn a tuple of types into a tuple of `ServiceArg`.
 */
type Params<T extends any[]> = ParamsInner<Required<T>>;
