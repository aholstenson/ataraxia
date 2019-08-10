/**
 * This example starts a network named `example` and uses a machine-local
 * transport and connects a TCP transport if this instance is elected to be the
 * leader of the local network.
 *
 * It will log when new nodes are discovered and when messages are received.
 * In addition to this it sends a hello to nodes when they are seen and
 * broadcasts a counter every 5 seconds to all current nodes.
 */

const { Network, AnonymousAuth } = require('../packages/core');
const { MachineLocalTransport } = require('../packages/local');
const { TCPTransport, TCPPeerMDNSDiscovery } = require('../packages/tcp');

const net = new Network({
	name: 'example',
	authentication: [
		new AnonymousAuth()
	]
});

// Add the machine-local transport with TCP support
const localTransport = new MachineLocalTransport();
localTransport.onLeader(() => {
	console.log('This node is now the leader of the machine-local network, starting TCP transport');
	net.addTransport(new TCPTransport({
		discovery: new TCPPeerMDNSDiscovery()
	}));
});
net.addTransport(localTransport);

// A counter that is sent to other nodes
let counter = 0;

// Log when new nodes are available and send them a hello with the counter
net.onNodeAvailable(node => {
	console.log('Node', node, 'is now available');
	node.send('hello', { counter: counter });
});

net.onNodeUnavailable(node => {
	console.log('Node', node, 'is no longer available');
});

// Log when messages have been received
net.onMessage(msg => {
	console.log('Message was received:', 'type=', msg.type, 'data=', msg.data, 'source=', msg.source);
});

// Increment and broadcast counter to all nodes every five seconds
setInterval(() => {
	net.broadcast('counter', { current: ++counter });
}, 5000);

// Start the network
net.start()
	.then(() => console.log('Network has started with id', net.networkId))
	.catch(err => console.error(err));
