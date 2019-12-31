import { ServiceReflect } from './ServiceReflect';
import { ServiceMethod } from './ServiceMethod';

export class MergedServiceReflect implements ServiceReflect {
	public readonly id: string;
	private readonly reflects: ServiceReflect[];

	constructor(id: string) {
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

	public hasMethod(method: string): boolean {
		// TODO: Implement
		return false;
	}

	public getMethod(method: string): ServiceMethod | null {
		// TODO: Implement
		return null;
	}

	public get methods(): ServiceMethod[] {
		return [];
	}

	public addReflect(reflect: ServiceReflect) {
		this.reflects.push(reflect);
	}

	public removeReflect(reflect: ServiceReflect) {
		const idx = this.reflects.indexOf(reflect);
		if(idx >= 0) {
			this.reflects.splice(idx, 1);
		}
	}

	public hasReflects() {
		return this.reflects.length > 0;
	}
}
