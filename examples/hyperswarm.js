/**
 * This example starts a network named `example` and uses a TCP transport with
 * discovery of peers on the same network using mDNS.
 *
 * It will log when new nodes are discovered and when messages are received.
 * In addition to this it sends a hello to nodes when they are seen and
 * broadcasts a counter every 5 seconds to all current nodes.
 */

 const { Network, AnonymousAuth } = require('../packages/core');
 const { HyperswarmTransport } = require('../packages/hyperswarm');

 const net = new Network({
	 name: 'example',
	 authentication: [
		 new AnonymousAuth()
	 ]
 });

 // Add the TCP transport with mDNS discovery
 net.addTransport(new HyperswarmTransport({
	 topic: 'ataraxia-example'
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
 net.start()
	 .then(() => {
		 console.log('Network has started with id', net.networkId);

		 // Start our helper
		 return require('./helpers/counter')(net);
	 })
	 .catch(err => console.error(err));
