# ataraxia

[![npm version](https://img.shields.io/npm/v/ataraxia)](https://www.npmjs.com/package/ataraxia)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia)](https://libraries.io/npm/ataraxia)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia.html)

<p align="center">
  <img width="460" src="https://raw.githubusercontent.com/aholstenson/ataraxia/master/docs/mesh-example.svg">
</p>

Connect nodes, such as NodeJS-apps or browsers, together and send messages 
between them. Provides a mesh network with peer-to-peer messaging, allowing
messages to be routed between nodes that are not directly connected with each
other.

* Instances can **send and receive messages** from other instances
* Partially connected **mesh network**, messages will be routed to their target if needed
* **Authentication support**, anonymous and shared secret authentication available in core
* **Encryption**, most transports establish an encrypted connection by default
* **RPC**,  register and consume services anywhere in the network, supports method call and events, via [ataraxia-services](https://github.com/aholstenson/ataraxia/tree/master/packages/services)
* Support for **different transports**
  * [Machine-local transport](https://github.com/aholstenson/ataraxia/tree/master/packages/local), connect to NodeJS-instances on the local machine 
  * [TCP-based transport](https://github.com/aholstenson/ataraxia/tree/master/packages/tcp) with customizable discovery of peers, [mDNS](https://aholstenson.github.io/ataraxia/classes/ataraxia_tcp.tcppeermdnsdiscovery.html) included for discovery on the local network
  * Websockets, both [server-side](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-server) 
    and [client-side](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-client) variants 
  * [Hyperswarm](https://github.com/aholstenson/ataraxia/tree/master/packages/hyperswarm)
    to find and connect to peers over the public Internet

## Getting started

To setup your own network install the `ataraxia` package and at least one
transport such as `ataraxia-tcp`:

```
$ npm install ataraxia ataraxia-tcp
```

A network can then be created and joined:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

const net = new Network({
  name: 'ataraxia-example',
  transports: [
    new TCPTransport({
      discovery: new TCPPeerMDNSDiscovery(),
      authentication: [
        new AnonymousAuth()
      ]
    })
  ]
});

net.onNodeAvailable(node => {
  console.log('A new node is available:', node.id);
  node.send('hello')
    .catch(err => console.log('Unable to send hello', err));
});

net.onMessage(msg => {
  console.log('A message was received', msg.type, 'with data', msg.data, 'from', msg.source.id);
});

// Join the network
await net.join();
```

## Usage

The package [ataraxia](https://github.com/aholstenson/ataraxia/tree/master/packages/core) 
contains the main code used to setup and join a [network](https://aholstenson.github.io/ataraxia/classes/ataraxia.network.html).

When a network is joined [nodes](https://aholstenson.github.io/ataraxia/interfaces/ataraxia.node.html)
will become available and unavailable, opening up for the ability to send and
receive messages from them.

### Machine-local transport with TCP transport

This example creates a network where instances on the same machine connect to
each other locally first and then elects one instance to handle connections
to other machines on the same physical network.

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
import { MachineLocalTransport } from 'ataraxia-local';

// Setup a network
const net = new Network({
  name: 'name-of-your-app-or-network'
});

net.addTransport(new MachineLocalTransport([
  onLeader: () => {
    /*
    * The leader event is emitted when this instance becomes the leader
    * of the machine-local network. This instance will now handle
    * connections to other machines in the network.
    */
    net.addTransport(new TCPTransport({
      discovery: new TCPPeerMDNSDiscovery(),

      authentication: [
        new AnonymousAuth()
      ]
    }));
  }
]);

await net.join();
```

### Built-in primitives

#### Groups

Support for groups are built into the core library, allowing nodes to join
a subset of the network and keep track of members of that subset.

```javascript
import { Group } from 'ataraxia';

const group = new Group(net, 'name-of-group');

// Join a group
await group.join();

// Leave a group
await group.leave();
```

#### `PerNodeState`

`PerNodeState` is a utility that can be used to keep track of a certain value
on every node in a certain group or network.

```javascript
import { PerNodeState } from 'ataraxia';

const state = new PerNodeState(net, 'name-of-state');

state.onUpdate((node, newState) => ...);

await state.set(dataHere);
```

`PerNodeState` supports sending differences between two versions:

```javascript
import { PerNodeState } from 'ataraxia';

const state = new PerNodeState(net, 'name-of-state', {
  defaultValue: [],

  applyPatch(current, diff) {
    // Append only merge
    return [ ...current, diff ];
  },

  generatePatch(value, lastVersion) {
    // value is the current value
    // lastVersion is the last version a node synced from us
    const result = [];
    for(let i = 0; i < value.length; i++) {
      if(value[i].version > lastVersion) {
        result.push(value[i]);
      }
    }
    return result;
  }
});

state.onUpdate((node, newState) => ...);

await state.set([
  ...state.get(),
  {
      version: state.version(),
      name: 'super-value'
  }
]);
```

### Support for services

Services are supported via `ataraxia-services`, where objects can be registered
and functions on them called remotely:

```javascript
import { Services, ServiceContract, stringType } from 'ataraxia-services';

const net = ... // setup network with at least one transport

const services = new Services(net);

services.onAvailable(service => console.log(service.id, 'is now available'));
services.onUnavailable(service => console.log(service.id, 'is no longer available'));

// Join the network
await net.join();

// Join the services on top of the network
await services.join();

// Use contracts to describe services
const EchoService = new ServiceContract()
  .defineMethod('echo', {
    returnType: stringType,
    parameters: [
      {
        name: 'message',
        type: stringType
      }
    ]
  });

// Easily register and expose services to other nodes
services.register('echo', EchoService.implement({
  echo(message) {
    return Promise.resolve(message);
  }
}));

// Consume a service registered anywhere, local or remote
const echoService = services.get('echo');
if(echoService.available) {
  // Call methods
  await echoService.call('echo', 'Hello world');
  
  // Or create a proxy for a cleaner API
  const proxied = echoService.as(EchoService);
  await proxied.echo('Hello world');
}
```

## API

### `Network`

* `new Network(options)`
  
  Create a new network using the given options.

  * `options`
    * `name: string`, name of the network, should be short and describe the app or library.
    * `transports?: Transport[]`, transports to start with
    * `endpoint?: boolean`, request that the local node is an endpoint that should not perform routing.
  
* `networkId: string`

  The automatically generated id of this node.

* `join(): Promise<Boolean>`
  
  Returns: `true` if network was started, `false` otherwise

  Start the network and its transports. This will start up all transports and
  perform initial connections to peers.

* `leave(): Promise<Boolean>`

  Returns: `true` if network was stopped, `false` otherwise
  
  Stop the network and its transports. This will attempt to gracefully disconnect
  to the current peers and shut down the transports.

* `addTransport(transport: Transport): void`
  
  Add a transport that should be used. Used in addition to providing transports
  in the constructor to allow for dynamic configuration. If the network has
  been started this will start the transport asynchronously.

* `onNodeAvailable(callback: (node: Node) => void)`
  
  A node has been found and messages can now be sent and received to/from it.
  
* `onNodeUnavailable(callback: (node: Node) => void)`
  
  A node is no longer available.

* `onMessage(callback: (message: Message) => void)`
  
  A message has been received from a node.

### `Node`

* `id: string`
  
  The id of the node.

* `onUnavailable(callback: () => void)` 
  
  Event emitted when node is no longer available.

* `onMessage(callback: (message: Message) => void)`
 
  Event emitted when a message has been received from this node.

* `send(type: string, data: any): Promise<void>`
  
  Send a message of the given type with the specified data to the node.


### `Message`

* `source: Node`
  
  The node that sent the message. Can be used to send an answer back.
  
* `type: string`
  
  The type of the message.

* `data: any`
  
  The data of the message.
