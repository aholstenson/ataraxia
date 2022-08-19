/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link WebSocketClientTransport WebSocket client-side transport} that
 * joins a {@link Network} by connecting to a websocket server.
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { WebSocketClientTransport } from 'ataraxia-ws-client';
 *
 * // Setup a network with a WebSocket client
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transports: [
 *     new WebSocketClientTransport({
 *       // URL to the websocket on the server
 *       url: 'ws://localhost:7000',
 *       // If using outside a browser, define how a WebSocket is created
 *       factory: url => new WebSocket(url),
 *       // Use anonymous authentication
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
 * @module ataraxia-ws-client
 */

export * from './WebSocket.js';
export * from './WebSocketFactory.js';

export * from './AbstractWebSocketPeer.js';
export * from './WebSocketClientTransport.js';
