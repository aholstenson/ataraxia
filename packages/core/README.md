# ataraxia

[![npm version](https://badge.fury.io/js/ataraxia.svg)](https://badge.fury.io/js/ataraxia)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/core)](https://david-dm.org/aholstenson/ataraxia?path=packages/core)

Mesh networking with peer-to-peer messaging for NodeJS. Ataraxia connects
different NodeJS instances together and allows messages to be passed between
these instances. Some instances may act as routers for other instances to
create a mesh network.

For support for services with RPC and events see [ataraxia-services](https://github.com/aholstenson/ataraxia/tree/master/packages/services).

## Installation

```
npm install ataraxia
```

Also install one or more transports:

* [ataraxia-local](https://github.com/aholstenson/ataraxia/tree/master/packages/local) provides a machine-local transport
* [ataraxia-tcp](https://github.com/aholstenson/ataraxia/tree/master/packages/tcp) provides a TCP-based transport with local network discovery
* [ataraxia-ws-client](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-client) and [ataraxia-ws-server](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-server) for websockets

## Example with TCP transport

```javascript
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });
net.addTransport(new TCPTransport());

net.on('node:available', node => {
  console.log('A new node is available:', node.id);
  node.send('hello');
});

net.on('message', msg => {
  console.log('A message was received', msg.type, 'with data', msg.data, 'from', msg.returnPath.id);
});

net.start()
  .then(...)
  .catch(...);
```

## Example with machine-local transport and TCP transport

This example creates a network where instances on the same machine connect to
each other locally first and then elects one instance to handle connections
to other machines on the same network.

```javascript
const Network = require('ataraxia');
const LocalTransport = require('ataraxia-local');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });

const local = new LocalTransport();
local.on('leader', () => {
  /*
   * The leader event is emitted when this instance becomes the leader
   * of the machine-local network. This instance will now handle
   * connections to other machines in the network.
   */
  net.addTransport(new TCPTransport());
});
net.addTransport(local);

net.start()
  .then(...)
  .catch(...);
```

## API

### Network

* `new Network(options)` - create a new network using the given options. Options may be:
  * `name` - *Required.* The name of the network, should be short and describe the app or library.
  * `endpoint` - Request that the local node is an endpoint that should not perform routing.
* `start()` - start the network and its transports
* `stop()` - stop the network and its transports
* `addTransport(transport)` - add a transport that should be used
* `on('node:available', node => ...)` - a node has been found and messages can now be sent and received to/from it
* `on('node:unavailable', node => ...)` - a node is no longer available
* `on('message', ({ returnPath, type, data }) => ...)` - a message has been received from a node

### Node

* `id` - get the id of the node
* `available` - get if the node is reachable
* `on('unavailable', () => ...)` - node is no longer available
* `send(type, data)` - send a message of the given type with the specified data to the node
* `on('message', ({ returnPath, type, data }) => ...)` - a message has been received from this node
