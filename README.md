# Ataraxia

Mesh networking with peer-to-peer messaging for NodeJS. Ataraxia connects
different NodeJS instances together and allows messages to be passed between
these instances. Some instances may act as routers for other instances to
create a mesh network.

Ataraxia is split into several projects:

* [ataraxia](packages/core) is the main library that provides the messaging functionality
* [ataraxia-local](packages/local) provides a machine-local transport
* [ataraxia-tcp](packages/tcp) provides a TCP-based transport with local network discovery
* [ataraxia-services](packages/services) provides easy-to-use services with RPC and events

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
  console.log('A message was received', msg.type, 'with data', msg.payload, 'from', msg.returnPath.id);
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

## Support for services

Services are supported via `ataraxia-services`, where objects can be registered
and functions on them called remotely:

```javascript
const Services = require('ataraxia-services');

const net = ... // setup network with at least one transport

const services = new Services(net);

// Listen for services
services.on('available', service => console.log(service.id, 'is now available'));
services.on('unavailable', service => console.log(service.id, 'is no longer available'));

// Start the network
net.start()
  .then(() => console.log('Network is started'))
  .catch(err => console.log('Error while starting:', err));

// Register services
const handle = services.register('service-id', {
  hello() {
    return 'Hello world';
  }
});

// Emit events
handle.emitEvent('hello', { data: 'goes-here' });

// Interact with services
const service = services.get('service-id');
if(service) {
  service.hello()
    .then(result => console.log('service said', result))
    .catch(handleErrorCorrectlyHere);

  service.on('hello', data => console.log('got', data));
}
```
