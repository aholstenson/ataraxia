import { ServiceReflect } from './ServiceReflect';
import { ServiceMethod } from './ServiceMethod';

export class ServiceReflectImpl implements ServiceReflect {
	public readonly id: string;
	private _methods: Map<string, ServiceMethod>;
	private callResolver: (method: string, args: any[]) => Promise<any>;

	constructor(
		id: string,
		methods: Map<string, ServiceMethod>,
		callResolver: (method: string, args: any[]) => Promise<any>
	) {
		this.id = id;
		this._methods = methods;
		this.callResolver = callResolver;
	}

	public apply(method: string, args: any[]): Promise<any> {
		return this.callResolver(method, args);
	}

	public call(method: string, ...args: any[]): Promise<any> {
		return this.callResolver(method, args);
	}

	public getMethod(name: string) {
		return this._methods.get(name) || null;
	}

	public hasMethod(name: string) {
		return this._methods.has(name);
	}

	public get methods() {
		return [ ...this._methods.values() ];
	}
}
