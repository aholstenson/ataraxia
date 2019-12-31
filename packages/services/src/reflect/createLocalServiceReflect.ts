import { LocalService } from '../LocalService';
import { ServiceReflect } from './ServiceReflect';
import { ServiceMethod } from './ServiceMethod';
import { ServiceReflectImpl } from './ServiceReflectImpl';

export function createLocalServiceReflect(service: LocalService): ServiceReflect {
	const methods = findMethods(service);

	return new ServiceReflectImpl(
		service.id,
		methods,
		(method, args) => {
			const func = service[method];
			if(typeof func !== 'function') {
				return Promise.reject(new Error('Method ' + method + ' does not exist'));
			}

			return Promise.resolve(func.apply(service, args));
		}
	);
}

/**
 * Find the methods of the object.
 *
 * @param object
 */
function findMethods(object: any) {
	const result: Map<string, ServiceMethod> = new Map();

	while(object) {
		for(const key of Object.getOwnPropertyNames(object)) {
			if(result.has(key)) continue;

			const method: ServiceMethod = {
				name: key,
				parameters: [
					{
						rest: true
					}
				]
			};

			result.set(key, method);
		}

		object = Object.getPrototypeOf(object);
	}

	return result;
}
