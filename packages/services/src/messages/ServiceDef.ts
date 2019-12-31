import { ServiceMethodDef } from './ServiceMethodDef';

export interface ServiceDef {
	readonly id: string;

	readonly methods: ReadonlyArray<ServiceMethodDef>;
}
