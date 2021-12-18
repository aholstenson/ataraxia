import { AsyncSubscriptionHandle, Listener } from 'atvik';

import { ServiceContract, ServiceParameterContract } from 'ataraxia-service-contracts';

import { ServiceEventDef } from '../defs/ServiceEventDef.js';
import { ServiceMethodDef } from '../defs/ServiceMethodDef.js';
import { ServiceParameterDef } from '../defs/ServiceParameterDef.js';

import { ServiceReflect } from './ServiceReflect.js';

/**
 * Implementation of `ServiceReflect` for local services. This implementation
 * will call methods and subscribe to events directly on the object it is
 * created for.
 */
export class LocalServiceReflect extends ServiceReflect {
	private readonly instance: any;

	public constructor(
		id: string,
		contract: ServiceContract<any>,
		instance: any
	) {
		super(id, toMethods(contract), toEvents(contract));

		this.instance = instance;
	}

	public override apply(method: string, args: any[]): Promise<any> {
		const func = this.instance[method];
		if(typeof func !== 'function') {
			return Promise.reject(new Error('Method ' + method + ' does not exist'));
		}

		return Promise.resolve(func.apply(this.instance, args));
	}

	public override async subscribe(event: string, listener: Listener<void, any[]>): Promise<AsyncSubscriptionHandle> {
		const p = this.instance[event];
		return await p.subscribe(listener);
	}

	public override async unsubscribe(event: string, listener: Listener<void, any[]>): Promise<boolean> {
		const p = this.instance[event];
		return await p.unsubscribe(listener);
	}
}

/**
 * Convert a contract into a map of method definitions.
 *
 * @param contract -
 *   contract to convert
 * @returns
 *   map of method definitions
 */
function toMethods(contract: ServiceContract<any>): Map<string, ServiceMethodDef> {
	const result = new Map<string, ServiceMethodDef>();

	for(const method of contract.methods) {
		result.set(method.name, {
			name: method.name,
			description: method.description,
			returnType: method.returnType.id,
			parameters: convertParameters(method.parameters)
		});
	}

	return result;
}

/**
 * Convert a contract into a map of event definitions.
 *
 * @param contract -
 *   contract to convert
 * @returns
 *   map of event definitions
 */
function toEvents(contract: ServiceContract<any>): Map<string, ServiceEventDef> {
	const result = new Map<string, ServiceEventDef>();

	for(const event of contract.events) {
		result.set(event.name, {
			name: event.name,
			description: event.description,
			parameters: convertParameters(event.parameters)
		});
	}

	return result;
}

/**
 * Convert parameters as used in service contracts into definitions used by
 * service layer.
 *
 * @param parameters -
 *   parameters to convert
 * @returns
 *   parameter definitions
 */
function convertParameters(parameters: ReadonlyArray<ServiceParameterContract>): ServiceParameterDef[] {
	return parameters.map(param => {
		return {
			name: param.name,
			description: param.description,
			optional: param.optional,
			rest: param.rest,
			type: param.type.id
		};
	});
}
