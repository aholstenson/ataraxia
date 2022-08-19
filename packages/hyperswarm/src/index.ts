/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link HyperswarmTransport Hyperswarm transport} for {@link Network} that
 * discovers and connects to peers using a specific topic via the public
 * Internet using [Hyperswarm](https://github.com/hyperswarm/hyperswarm).
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { HyperswarmTransport } from 'ataraxia-hyperswarm';
 *
 * // Setup a network over Hyperswarm
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transports: [
 *     new HyperswarmTransport({
 *       // Topic used to find peers
 *       topic: 'Unique Topic',
 *       // Setup anonymous authentication
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *   ]
 * });
 *
 * // Join the network
 * await net.join();
 * ```
 *
 * @module ataraxia-hyperswarm
 */

export * from './HyperswarmTransport.js';
