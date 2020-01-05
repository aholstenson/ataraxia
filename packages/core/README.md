# ataraxia

[![npm version](https://badge.fury.io/js/ataraxia.svg)](https://badge.fury.io/js/ataraxia)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/core)](https://david-dm.org/aholstenson/ataraxia?path=packages/core)

Mesh networking with peer-to-peer messaging for NodeJS and the browser.
Ataraxia connects different instances together and allows messages to be passed
between these instances. Some instances may act as routers for other instances
to create a partially connected mesh network.

## Features

* Instances can send and receive messages from other instances
* Partially connected mesh network, messages will be routed to their target
* Authentication support, anonymous and shared secret authentication available in core
* RPC support with remote method invocation and events via [ataraxia-services](https://github.com/aholstenson/ataraxia/tree/master/packages/services)
* Support for different transports
  * [ataraxia-local](https://github.com/aholstenson/ataraxia/tree/master/packages/local) provides a machine-local transport
  * [ataraxia-tcp](https://github.com/aholstenson/ataraxia/tree/master/packages/tcp) provides a TCP-based transport with  customizable discovery of peers
  * [ataraxia-ws-client](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-client) and [ataraxia-ws-server](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-server) for websockets

## Example with TCP transport

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network',
  authentication: [
    new AnonymousAuth()
  ]
});

// Setup a TCP transport that will discover other peers on the same network using mDNS
net.addTransport(new TCPTransport({
  discovery: new TCPPeerMDNSDiscovery()
}));

net.onNodeAvailable(node => {
  console.log('A new node is available:', node.id);
  node.send('hello');
});

net.onMessage(msg => {
  console.log('A message was received', msg.type, 'with data', msg.data, 'from', msg.source.id);
});

// Start the network
await net.start();
```

## Example with machine-local transport and TCP transport

This example creates a network where instances on the same machine connect to
each other locally first and then elects one instance to handle connections
to other machines on the same network.

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
import { MachineLocalTransport } from 'ataraxia-local';

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network',
  authentication: [
    new AnonymousAuth()
  ]
});

const local = new MachineLocalTransport();
local.onLeader(() => {
  /*
   * The leader event is emitted when this instance becomes the leader
   * of the machine-local network. This instance will now handle
   * connections to other machines in the network.
   */
  net.addTransport(new TCPTransport());
});
net.addTransport(local);

await net.start();
```

## API

### Network

* `new Network(options)` - create a new network using the given options. Options may be:
  * `name` - *Required.* The name of the network, should be short and describe the app or library.
  * `endpoint` - Request that the local node is an endpoint that should not perform routing.
* `start()` - start the network and its transports
* `stop()` - stop the network and its transports
* `addTransport(transport)` - add a transport that should be used
* `onNodeAvailable(node => ...)` - a node has been found and messages can now be sent and received to/from it
* `onNodeUnavailable(node => ...)` - a node is no longer available
* `onMessage((message: Message) => ...)` - a message has been received from a node

### Node

* `id` - get the id of the node
* `onUnavailable(() => ...)` - node is no longer available
* `send(type, data)` - send a message of the given type with the specified data to the node
* `onMessage((message: Message) => ...)` - a message has been received from this node

### Message

* `source: Node` - the node that sent the message 
* `type: string` - the type of the message
* `data: any` - the data of the message
