# ataraxia

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

## Example with TCP transport

```javascript
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });
net.addTransport(new TCPTransport());
net.start();

net.on('node:available', node => {
  console.log('A new node is available:', node.id);
  node.send('hello');
});

net.on('message', msg => {
  console.log('A message was received', msg.type, 'with data', msg.data, 'from', msg.returnPath.id);
});
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
net.start();
```
