/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * {@link TCPTransport TCP-based transport} for {@link Network}, can discover and automatically
 * establish encrypted connections over TCP.
 *
 * Supports pluggable discoveries via {@link TCPPeerDiscovery} with a mDNS
 * implementation in {@link TCPPeerMDNSDiscovery} that discover peers on the
 * same local network.
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
 *
 * // Setup a network with anonymous authentication
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transports: [
 *     new TCPTransport({
 *       // Discover other peers on the same physical network
 *       discovery: new TCPPeerMDNSDiscovery(),
 *       // Use anonymous authentication
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *   ]
 * });
 *
 * // Start the network
 * await net.start();
 * ```
 *
 * @module ataraxia-tcp
 */

export * from './TCPPeerDiscovery';
export * from './TCPPeerMDNSDiscovery';

export * from './TCPTransport';
