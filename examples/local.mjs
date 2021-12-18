/**
 * This example starts a network named `example` and uses a machine-local
 * transport with a socket placed in the temporary folder of the machine.
 *
 * It will log when new nodes are discovered and when messages are received.
 * In addition to this it sends a hello to nodes when they are seen and
 * broadcasts a counter every 5 seconds to all current nodes.
 */
import { Network } from 'ataraxia';
import { MachineLocalTransport } from 'ataraxia-local';

import { counter } from './helpers/counter.mjs';

const net = new Network({
	name: 'example',

	transports: [
		new MachineLocalTransport()
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
await net.join();
console.log('Network has been joined with id', net.networkId);

// Start our helper
counter(net);
