import { MergedServiceReflect } from './reflect/MergedServiceReflect.js';
import { ServiceReflect } from './reflect/ServiceReflect.js';
import { ServiceImpl } from './ServiceImpl.js';

/**
 * Information that is kept about a service locally.
 */
export class ServiceInfo {
	public readonly reflect: MergedServiceReflect;
	public readonly instance: ServiceImpl;

	public constructor(
		id: string,
		instance: ServiceImpl
	) {
		this.reflect = new MergedServiceReflect(id);
		this.instance = instance;
	}

	/**
	 * Add a reflect instance to this info. This will make the service callable.
	 *
	 * @param reflect -
	 *   reflect instance to add
	 */
	public addReflect(reflect: ServiceReflect) {
		this.reflect.addReflect(reflect);
	}

	/**
	 * Remove a reflect instance to this info. May make the service uncallable.
	 *
	 * @param reflect -
	 *   reflect instance to remove
	 */
	public removeReflect(reflect: ServiceReflect) {
		this.reflect.removeReflect(reflect);
	}
}
