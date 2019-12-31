import { serviceReflect } from './Service';
import { ServiceReflect } from './reflect';
import { MergedServiceReflect } from './reflect/MergedServiceReflect';

export class ServiceImpl {
	public readonly id: string;
	public readonly proxy: any;

	private readonly reflect: MergedServiceReflect;

	constructor(id: string) {
		this.id = id;
		this.reflect = new MergedServiceReflect(id);

		const self = this;
		this.proxy = new Proxy({}, {
			get(obj, name) {
				if(name === 'id') {
					return self.id;
				} else if(name === serviceReflect) {
					return self.reflect;
				} else if(typeof name === 'string') {
					// TODO: Events
					return (...args: any[]) => self.reflect.apply(name, args);
				} else {
					return undefined;
				}
			}
		});
	}

	public addReflect(reflect: ServiceReflect) {
		this.reflect.addReflect(reflect);
	}

	public removeReflect(reflect: ServiceReflect) {
		this.reflect.removeReflect(reflect);
	}

	public hasReflects() {
		return this.reflect.hasReflects();
	}
}
