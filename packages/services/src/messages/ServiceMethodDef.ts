import { ServiceMethodParameterDef } from './ServiceMethodParameterDef';

export interface ServiceMethodDef {
	readonly name: string;

	readonly parameters: ReadonlyArray<ServiceMethodParameterDef>;
}
