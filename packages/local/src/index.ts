/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link MachineLocalTransport Machine-local transport} for {@link Network}
 * that connects together instances on the same machine via a Unix socket.
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { MachineLocalTransport } from 'ataraxia-local';
 *
 * // Setup a network
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transports: [
 *     new MachineLocalTransport()
 *   ]
 * });
 *
 * await net.join();
 * ```
 *
 * @module ataraxia-local
 */

export * from './MachineLocalTransport.js';
