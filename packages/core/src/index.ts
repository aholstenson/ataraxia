/* eslint-disable tsdoc/syntax,jsdoc/require-description */
/**
 * Mesh networking with peer-to-peer messaging for NodeJS and the browser.
 * Ataraxia connects different instances together and allows messages to be passed
 * between these instances. Some instances may act as routers for other instances
 * to create a partially connected mesh network.
 *
 * {@link Network} is the main class used to join a network:
 *
 * ```javascript
 * import { Network, AnonymousAuth } from 'ataraxia';
 * import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
 *
 * // Setup a network with a TCP transport
 * const net = new Network({
 *   name: 'name-of-your-app-or-network',
 *   transports: [
 *     new TCPTransport({
 *       // Discover peers using mDNS
 *       discovery: new TCPPeerMDNSDiscovery(),
 *       // Setup anonymous authentication
 *       authentication: [
 *         new AnonymousAuth()
 *       ]
 *     })
 *   ]
 * });
 *
 * net.onNodeAvailable(node => {
 *   console.log('A new node is available', node);
 * });
 *
 * net.onMessage(msg => {
 *   console.log('A new message was received');
 * });
 *
 * // Join the network
 * await net.join();
 * ```
 *
 * Authentication is provided via {@link AnonymousAuth} or
 * {@link SharedSecretAuth}.
 *
 * @module ataraxia
 */

export {
	AuthProvider,
	AnonymousAuth,
	SharedSecretAuth,
	SharedSecretAuthOptions,

	Transport
} from 'ataraxia-transport';

export * from './Debugger.js';

export * from './Network.js';
export * from './Node.js';

export * from './Message.js';
export * from './MessageData.js';
export * from './MessageType.js';
export * from './MessageUnion.js';

export * from './Group.js';
export * from './group/NamedGroup.js';
export * from './RequestReplyHelper.js';

export * from './Gossiper.js';
export * from './state/PerNodeState.js';
