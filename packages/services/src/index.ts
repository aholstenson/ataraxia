/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link Services} with RPC and events, provides a service layer on top of a
 * {@link Network} allowing nodes to register, discover and call services on
 * the network.
 *
 * ```javascript
 * import { Services, ServiceContract, stringType } from 'ataraxia-services';
 *
 * const net = ... // setup network with at least one transport
 *
 * const services = new Services(net);
 *
 * services.onAvailable(service => console.log(service.id, 'is now available'));
 * services.onUnavailable(service => console.log(service.id, 'is no longer available'));
 *
 * // Join the network
 * await net.join();
 *
 * // Join the services on top of the network
 * await services.join();
 *
 * // Use contracts to describe services
 * const EchoService = new ServiceContract()
 *   .defineMethod('echo', {
 *     returnType: stringType,
 *     parameters: [
 *       {
 *         name: 'message',
 *         type: stringType
 *       }
 *     ]
 *   });
 *
 * // Easily register and expose services to other nodes
 * services.register('echo', EchoService.implement({
 *   echo(message) {
 *     return Promise.resolve(message);
 *   }
 * }));
 *
 * // Consume a service registered anywhere, local or remote
 * const echoService = services.get('echo');
 * if(echoService.available) {
 *   // Call methods
 *   await echoService.call('echo', 'Hello world');
 *
 *   // Or create a proxy for a cleaner API
 *   const proxied = echoService.as(EchoService);
 *   await proxied.echo('Hello world');
 * }
 * ```
 *
 * @module ataraxia-services
 */

export * from './Services.js';
export * from './Service.js';
export * from './ServiceHandle.js';

export * from 'ataraxia-service-contracts';
