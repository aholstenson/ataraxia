import { ServiceMethodDef } from './ServiceMethodDef';
import { ServiceEventDef } from './ServiceEventDef';

export interface ServiceDef {
	readonly id: string;

	readonly methods: ReadonlyArray<ServiceMethodDef>;

	readonly events: ReadonlyArray<ServiceEventDef>;
}
