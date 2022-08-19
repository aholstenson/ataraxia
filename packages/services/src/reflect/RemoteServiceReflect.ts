import { AsyncSubscriptionHandle, Listener } from 'atvik';

import { BasicValue } from 'ataraxia-service-contracts';

import { ServiceDef } from '../defs/ServiceDef.js';
import { ServiceEventDef } from '../defs/ServiceEventDef.js';
import { ServiceMethodDef } from '../defs/ServiceMethodDef.js';

import { RemoteServiceHelper } from './RemoteServiceHelper.js';
import { ServiceReflect } from './ServiceReflect.js';

/**
 * Implementation of `ServiceReflect` for remote services.
 */
export class RemoteServiceReflect extends ServiceReflect {
	private readonly helper: RemoteServiceHelper;
	private readonly eventRegistrations: Map<string, Listener<void, any[]>[]>;

	public constructor(
		def: ServiceDef,
		helper: RemoteServiceHelper
	) {
		super(def.id, toServiceMethods(def), toServiceEvents(def));

		this.helper = helper;
		this.eventRegistrations = new Map();
	}

	public override apply(method: string, args: BasicValue[]): Promise<BasicValue> {
		return this.helper.call(method, args);
	}

	public override async subscribe(event: string, listener: Listener<void, any[]>): Promise<AsyncSubscriptionHandle> {
		const self = this;
		const unsubscriber = {
			async unsubscribe() {
				await self.unsubscribe(event, listener);
			}
		};

		const listeners = this.eventRegistrations.get(event);
		if(listeners) {
			listeners.push(listener);
			return unsubscriber;
		}

		// This is a new registration, store it and then ask to subscribe
		this.eventRegistrations.set(event, [ listener ]);

		await this.helper.requestSubscribe(event);
		return unsubscriber;
	}

	public async unsubscribe(event: string, listener: Listener<void, any[]>): Promise<boolean> {
		const listeners = this.eventRegistrations.get(event);
		if(! listeners) return false;

		const idx = listeners.indexOf(listener);
		if(idx < 0) return false;

		listeners.splice(idx, 1);
		if(listeners.length === 0) {
			// No more listeners, remove subscription to event
			this.eventRegistrations.delete(event);

			await this.helper.requestUnsubscribe(event);
		}

		return true;
	}

	public async emitEvent(event: string, args: ReadonlyArray<any>): Promise<void> {
		const listeners = this.eventRegistrations.get(event);
		if(! listeners) return;

		for(const l of listeners) {
			await l(...args);
		}
	}
}

/**
 * Turn a `ServiceDef` into a map of `ServiceMethod`.
 *
 * @param def -
 *   definition to convert
 * @returns
 *   map of `ServiceMethod`
 */
function toServiceMethods(def: ServiceDef) {
	const methods = new Map<string, ServiceMethodDef>();
	for(const methodDef of def.methods) {
		methods.set(methodDef.name, methodDef);
	}
	return methods;
}

/**
 * Turn a `ServiceDef` into a map of `ServiceEvent`.
 *
 * @param def  -
 *   definition to convert
 * @returns
 *   map of `ServiceEvent`
 */
function toServiceEvents(def: ServiceDef) {
	const events = new Map<string, ServiceEventDef>();
	for(const eventDef of def.events) {
		events.set(eventDef.name, eventDef);
	}
	return events;
}
