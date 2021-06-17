<p align="center">
  <img width="460" src="https://raw.githubusercontent.com/aholstenson/ataraxia/master/docs/mesh-example.svg">
</p>

</p>

# Ataraxia

[![npm version](https://img.shields.io/npm/v/ataraxia)](https://www.npmjs.com/package/ataraxia)
[![Build Status](https://github.com/aholstenson/ataraxia/actions/workflows/ci.yml/badge.svg)](https://github.com/aholstenson/ataraxia/actions/workflows/ci.yml)
[![Typedoc](https://img.shields.io/badge/typedoc-available-%23fff)](https://aholstenson.github.io/ataraxia)

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

## Contributing

Think this project is useful? Reporting issues, asking for clarification and
PRs are greatly appreciated.

### PRs

If you want to contribute code changes the way to do so is via PRs. For new
features open an issue first that the PR can be tied to.

1. Fork the project
2. Create a feature branch (`git checkout -b feature/cool-feature`)
3. Work on your changes
4. Push your changes (`git push origin feature/cool-feature`)
5. Open a pull request

### Working with the code

This project uses [Lerna](https://lerna.js.org/) together with
[Yarn](https://yarnpkg.com/) to manage several packages. You'll need to install
at least Yarn 1.x to work with the code.

When checking out the code run `yarn install` and `npx lerna boostrap` to get
started.

Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
specification.
