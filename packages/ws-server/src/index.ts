/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link WebSocketServerTransport WebSocket server-side transport} that
 * lets connecting clients join a {@link Network}.
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { WebSocketServerTransport } from 'ataraxia-ws-server';
 *
 * // Setup a network with a WebSocket server
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transport: [
 *     new WebSocketServerTransport({
 *       port: 7000,
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *   ]
 * });
 *
 * await net.join();
 * ```
 *
 * @module ataraxia-ws-server
 */

export * from './WebSocketServerTransport.js';
