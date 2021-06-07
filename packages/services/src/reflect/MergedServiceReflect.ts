import { Listener } from 'atvik';

import { ServiceReflect } from './ServiceReflect';

/**
 * `ServiceReflect` that merges several other reflects together.
 */
export class MergedServiceReflect extends ServiceReflect {
	public readonly id: string;
	private readonly reflects: ServiceReflect[];

	public constructor(id: string) {
		super(id, new Map(), new Map());
		this.id = id;

		this.reflects = [];
	}

	public apply(method: string, args: any[]): Promise<any> {
		// TODO: Different invocation policies
		for(const reflect of this.reflects) {
			if(reflect.hasMethod(method)) {
				return reflect.apply(method, args);
			}
		}

		return Promise.reject(new Error('Method ' + method + ' does not exist'));
	}

	public call(method: string, ...args: any[]): Promise<any> {
		return this.apply(method, args);
	}

	public async subscribe(event: string, listener: Listener<void, any[]>): Promise<void> {
		const promises: Promise<void>[] = [];

		for(const reflect of this.reflects) {
			if(reflect.hasEvent(event)) {
				promises.push(reflect.subscribe(event, listener));
			}
		}

		await Promise.all(promises);
	}

	public async unsubscribe(event: string, listener: Listener<void, any[]>): Promise<boolean> {
		const promises: Promise<boolean>[] = [];

		for(const reflect of this.reflects) {
			if(reflect.hasEvent(event)) {
				promises.push(reflect.unsubscribe(event, listener));
			}
		}

		/*
		 * Wait for the promises and return true if it was removed from any
		 * of the reflects.
		 */
		for(const r of await Promise.all(promises)) {
			if(r) {
				return true;
			}
		}

		return false;
	}

	public addReflect(reflect: ServiceReflect) {
		this.reflects.push(reflect);

		this.mergeMetadata();
	}

	public removeReflect(reflect: ServiceReflect) {
		const idx = this.reflects.indexOf(reflect);
		if(idx >= 0) {
			this.reflects.splice(idx, 1);
		}

		this.mergeMetadata();
	}

	public hasReflects() {
		return this.reflects.length > 0;
	}

	private mergeMetadata() {
		this._methods.clear();
		this._events.clear();

		for(const reflect of this.reflects) {
			for(const method of reflect.methods) {
				this._methods.set(method.name, method);
			}

			for(const event of reflect.events) {
				this._events.set(event.name, event);
			}
		}
	}
}
