/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link ServiceContract Service contracts} to define what methods and events
 * services support.
 *
 * Contracts are used to define how a service acts when used over the network.
 * They help define what methods and events are available and what types and
 * parameters those support.
 *
 * ```typescript
 * import { ServiceContract, AsyncSubscribable } from 'ataraxia-service-contracts';
 *
 * interface EchoService {
 *   onEcho: AsyncSubscribable<this, [ message: string ]>;
 *
 *   echo(message: string): Promise<string>;
 * }
 *
 * const EchoService = new ServiceContract<EchoService>()
 *   .defineMethod('echo', {
 *      returnType: stringType,
 *      parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *      ]
 *   })
 *   .defineEvent('onEcho', {
 *     parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *     ]
 *   });
 * ```
 *
 * For easy of use this module re-exports `AsyncEvent`, `AsyncSubscribable`
 * and `Listener` from [Atvik](https://aholstenson.github.io/atvik/) as those
 * are used for events.
 *
 * @module ataraxia-service-contracts
 */

export * from './BasicValue.js';
export * from './DataType.js';
export * from './dataTypes.js';

export * from './ServiceContract.js';
export * from './ServiceMethodContract.js';
export * from './ServiceEventContract.js';
export * from './ServiceParameterContract.js';

export { AsyncEvent } from 'atvik';
export type {
	Listener,
	AsyncSubscribable
} from 'atvik';
