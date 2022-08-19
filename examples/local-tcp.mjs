/**
 * This example starts a network named `example` and uses a machine-local
 * transport and connects a TCP transport if this instance is elected to be the
 * leader of the local network.
 *
 * It will log when new nodes are discovered and when messages are received.
 * In addition to this it sends a hello to nodes when they are seen and
 * broadcasts a counter every 5 seconds to all current nodes.
 */

import { Network, AnonymousAuth } from 'ataraxia';
import { MachineLocalTransport } from 'ataraxia-local';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

import { counter } from './helpers/counter.mjs';

const net = new Network({
	name: 'example'
});

// Add the machine-local transport with TCP support
net.addTransport(new MachineLocalTransport({
	onLeader: () => {
		console.log('This node is now the leader of the machine-local network, starting TCP transport');

		net.addTransport(new TCPTransport({
			discovery: new TCPPeerMDNSDiscovery(),

			authentication: [
				new AnonymousAuth()
			]
		}));
	}
}));

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
await net.join();
console.log('Network has been joined with id', net.networkId);

// Start our helper
counter(net);
