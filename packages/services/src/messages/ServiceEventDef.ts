import { ServiceMethodParameterDef } from './ServiceMethodParameterDef';

export interface ServiceEventDef {
	readonly name: string;

	readonly parameters: ReadonlyArray<ServiceMethodParameterDef>;
}
