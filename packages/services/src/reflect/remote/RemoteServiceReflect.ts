
import { Listener } from 'atvik';

import {
	ServiceDef,
	ServiceMethodDef,
	ServiceMethodParameterDef,
	ServiceEventDef
} from '../../messages';
import { ServiceEvent } from '../ServiceEvent';
import { ServiceMethod } from '../ServiceMethod';
import { ServiceParameter } from '../ServiceParameter';
import { ServiceReflect } from '../ServiceReflect';

import { RemoteServiceHelper } from './RemoteServiceHelper';

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
		const methods = toServiceMethods(def);
		const events = toServiceEvents(def);

		super(def.id, methods, events);

		this.helper = helper;
		this.eventRegistrations = new Map();
	}

	public apply(method: string, args: any[]): Promise<any> {
		return this.helper.call(method, args);
	}

	public async subscribe(event: string, listener: Listener<void, any[]>): Promise<void> {
		const listeners = this.eventRegistrations.get(event);
		if(listeners) {
			listeners.push(listener);
			return;
		}

		// This is a new registration, store it and then ask to subscribe
		this.eventRegistrations.set(event, [ listener ]);

		await this.helper.requestSubscribe(event);
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

	public emitEvent(event: string, args: ReadonlyArray<any>) {
		const listeners = this.eventRegistrations.get(event);
		if(! listeners) return;

		for(const l of listeners) {
			l(...args);
		}
	}
}

function toServiceMethods(def: ServiceDef) {
	const methods = new Map<string, ServiceMethod>();
	for(const methodDef of def.methods) {
		methods.set(methodDef.name, toServiceMethod(methodDef));
	}
	return methods;
}

function toServiceMethod(def: ServiceMethodDef): ServiceMethod {
	return {
		name: def.name,
		parameters: def.parameters.map(toServiceParameter)
	};
}

function toServiceParameter(def: ServiceMethodParameterDef): ServiceParameter {
	return {
		name: def.name,
		typeId: def.typeId,
		rest: def.rest
	};
}

function toServiceEvents(def: ServiceDef) {
	const events = new Map<string, ServiceEvent>();
	for(const eventDef of def.events) {
		events.set(eventDef.name, toServiceEvent(eventDef));
	}
	return events;
}

function toServiceEvent(def: ServiceEventDef): ServiceEvent {
	return {
		name: def.name,
		parameters: def.parameters.map(toServiceParameter)
	};
}
