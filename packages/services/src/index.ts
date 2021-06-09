/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link Services} with RPC and events, provides a service layer on top of a
 * {@link Network} allowing nodes to register, discover and call services on
 * the network.
 *
 * ```javascript
 * import { Services } from 'ataraxia-services';
 *
 * const net = ... // setup network with at least one transport
 *
 * const services = new Services(net);
 *
 * services.onServiceAvailable(service => console.log(service.id, 'is now available'));
 * services.onServiceUnavailable(service => console.log(service.id, 'is no longer available'));
 *
 * // Start the network
 * await net.start();
 *
 * // Start the services on top of the network
 * await services.start();
 *
 * // Register a service as a plain object
 * const handle = services.register({
 *   id: 'service-id',
 *
 *   hello() {
 *     return 'Hello world';
 *   }
 * });
 *
 * // Classes can be registered and created
 * services.register(class Test {
 *   constructor(handle) {
 *     this.handle = handle;
 *
 *     this.id = 'service-id';
 *   }
 *
 *   hello() {
 *     return 'Hello World';
 *   }
 * });
 *
 * // Interact with services
 * const service = services.get('service-id');
 * if(service) {
 *   console.log('Service found', service);
 *
 *   // Call functions on the service
 *   const reply = await service.hello();
 * }
 * ```
 *
 * @module ataraxia-services
 */

export * from './Services';
export * from './Service';
export * from './ServiceHandle';

export * from './reflect';

export { Listener } from 'atvik';
export * from './Subscribable';
export * from './SubscriptionHandle';
