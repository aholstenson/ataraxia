# ataraxia-tcp

TCP transport for [Ataraxia](https://github.com/aholstenson/ataraxia). This
transport discovers and automatically connects to other instances on the same
local network. Other peers are found using mDNS and DNS-SD that match the name
of the Ataraxia network.

## Installation

```
npm install ataraxia-tcp
```

## Simple usage

Create a TCP transport that will bind to a random free port and announce
its availability on the local network:

```javascript
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });
net.addTransport(new TCPTransport());

// Start the network
net.start()
  .then(...)
  .catch(...);
```

## Well-known ports and manual peers

In some cases you want to run a network that can be connected to from outside
your local network. In that case its possible to define a port that the TCP
transport will listen to:

```javascript
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });

const tcp = new TCPTransport({
  port: 30000, // A well known port - define your own or even better use a config file,
  discover: false // If you want to disable local network discovery
})
net.addTransport(tcp);

// Start the network
net.start()
  .then(...)
  .catch(...);
```

Another instance can then connect to that specific port:

```javascript
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });

const tcp = new TCPTransport({
  discover: false // If you want to disable local network discovery
})

// Add a manual addressing to the peer
tcp.addManualPeer({
  address: 'address-to-server',
  port: 30000
});

net.addTransport(tcp);

// Start the network
net.start()
  .then(...)
  .catch(...);
```

Ataraixa will attempt to connect to peer and if it can't be connected to will
attempt to reconnect once every 60 seconds.
