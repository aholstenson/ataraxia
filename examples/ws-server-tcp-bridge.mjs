/**
 * This example starts a network named `example` and uses a WebSocket server
 * transport on port 7000 and a TCP transports. This allows WebSocket clients
 * to connect to this server and send and receive messages from TCP-based nodes.
 *
 * It will log when new nodes are discovered.
 */

import { Network, AnonymousAuth } from 'ataraxia';
import { WebSocketServerTransport } from 'ataraxia-ws-server';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

const net = new Network({
	name: 'example',

	transports: [
		// Add the WebSocket transport auto-starting a server on port 7000
		new WebSocketServerTransport({
			port: 7000,

			authentication: [
				new AnonymousAuth()
			]
		}),

		// Add the TCP transport with mDNS discovery
		new TCPTransport({
			discovery: new TCPPeerMDNSDiscovery(),

			authentication: [
				new AnonymousAuth()
			]
		})
	]
});

// Log when new nodes are available and send them a hello with the counter
net.onNodeAvailable(node => {
	console.log('Node', node, 'is now available');
});

net.onNodeUnavailable(node => {
	console.log('Node', node, 'is no longer available');
});

// Start the network
await net.join();
console.log('Network has been joined with id', net.networkId);
