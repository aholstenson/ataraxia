# ataraxia-tcp

[![npm version](https://img.shields.io/npm/v/ataraxia-tcp)](https://www.npmjs.com/package/ataraxia-tcp)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-tcp)](https://libraries.io/npm/ataraxia-tcp)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--tcp-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_tcp.html)

TCP transport for [Ataraxia](https://github.com/aholstenson/ataraxia). This
transport can discover and automatically connect to other peers using a
discovery. A discovery is available based on mDNS and DNS-SD that automatically
connects to other instances on the same local network.

## Installation

```
npm install ataraxia-tcp
```

## Simple usage

Create a TCP transport that will bind to a random free port and announce
its availability on the local network:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network',
  
  transports: [
    new TCPTransport({
      // Discover other peers on the same physical network
      discovery: new TCPPeerMDNSDiscovery(),

      // Use anonymous authentication
      authentication: [
        new AnonymousAuth()
      ]
    })
  ]
});

// Join the network
await net.join();
```

## Well-known ports and manual peers

In some cases you want to run a network that can be connected to from outside
your local network. In that case its possible to define a port that the TCP
transport will listen to:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network',

  transports: [
    new TCPTransport({
      // A well known port - define your own or even better use a config file,
      port: 30000,

      // Use anonymous authentication
      authentication: [
        new AnonymousAuth()
      ]
    })
  ]
});

// Join the network
await net.join();
```

Another instance can then connect to that specific port:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network'
});

const tcp = new TCPTransport({
  authentication: [
    new AnonymousAuth()
  ]
}):

// Add a manual addressing to the peer
tcp.addManualPeer({
  host: 'address-to-server',
  port: 30000
});

net.addTransport(tcp);

// Join the network
await net.join();
```

Ataraxia will attempt to connect to the manually added peers and will attempt
to keep the connection available.

## API

### `TCPTransport`

* `new TCPTransport(options)`

  Create a new instance of this transport.

  * `options`
    * `port?: number`, port number that the server should bind to. Leave 
      undefined for automatic assignment.
    * `discovery?: TCPPeerDiscovery`, discovery instance used to discover and
      announce availability to other peers.
    * `authentication: AuthProvider[]`, array of authentication providers that
      this transport will use.

* `port: number`
  
  Port number bound to, will be `0` if no server was bound

* `addManualPeer(hostAndPort: { host: string, port: number }): void`

  Add a peer that should be manually connected to.

### `TCPPeerMDNSDiscovery`

* `new TCPPeerMDNSDiscovery()`

  Create a discovery instance that will use mDNS and DNS-SD on the local
  physical network.
