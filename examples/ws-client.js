/**
 * This example starts a network named `example` and uses a WebSocket server
 * transport on port 7000. WebSocket clients can then connect to this server
 * via the example `ws-client.js`.
 *
 * It will log when new nodes are discovered and when messages are received.
 * In addition to this it sends a hello to nodes when they are seen and
 * broadcasts a counter every 5 seconds to all current nodes.
 */
const WebSocket = require('../packages/ws-server/node_modules/ws');

const { Network, AnonymousAuth } = require('../packages/core');
const { WebSocketClientTransport } = require('../packages/ws-client');

const net = new Network({
	name: 'example',

	transports: [
		// Add the WebSocket transport and connect to port 7000
		new WebSocketClientTransport({
			url: 'ws://127.0.0.1:7000',
			webSocketFactory: url => new WebSocket(url),
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

// Log when messages have been received
net.onMessage(msg => {
	console.log('Message was received:', 'type=', msg.type, 'data=', msg.data, 'source=', msg.source);
});

// Start the network
net.join()
	.then(() => {
		console.log('Network has been joined with id', net.networkId);

		// Start our helper
		return require('./helpers/counter')(net);
	})
	.catch(err => console.error(err));
