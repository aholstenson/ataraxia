import { ServiceDef, ServiceMethodDef, ServiceMethodParameterDef } from '../messages';
import { ServiceReflect } from './ServiceReflect';
import { ServiceMethod } from './ServiceMethod';
import { ServiceMethodParameter } from './ServiceMethodParameter';
import { ServiceReflectImpl } from './ServiceReflectImpl';


export function createRemoteServiceReflect(
	def: ServiceDef,
	callResolver: (method: string, args: any[]) => Promise<any>
): ServiceReflect {
	const methods = new Map<string, ServiceMethod>();
	for(const methodDef of def.methods) {
		methods.set(methodDef.name, toServiceMethod(methodDef));
	}

	return new ServiceReflectImpl(
		def.id,
		methods,
		callResolver
	);
}

function toServiceMethod(def: ServiceMethodDef): ServiceMethod {
	return {
		name: def.name,
		parameters: def.parameters.map(toServiceMethodParameter)
	};
}

function toServiceMethodParameter(def: ServiceMethodParameterDef): ServiceMethodParameter {
	return {
		name: def.name,
		typeId: def.typeId,
		rest: def.rest
	};
}
