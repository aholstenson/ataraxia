# ataraxia-services

Services with RPC and events for [Ataraxia](https://github.com/aholstenson/ataraxia).

This project provides a service layer on top of a Ataraxia network and allows
nodes to easily register services and to call methods and receive events on
services on other nodes.

## Usage

```
npm install ataraxia-services
```

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

## Creating services

Services are simple objects:

```javascript
services.register('service-id', {
  hello(what='world') {
    return 'Hello ' + what;
  },

  property: 1234
});
```

The only special part of services is that the `metadata` property is
automatically distributed througout the network.

```javascript
services.register('service-with-metadata', {
  metadata: {
    type: 'cookie-factory'
  },
  
  cookiesMade: 0,

  makeCookie() {
    return ++this.cookiesMade;
  }
});
```

The metadata can be access on any node:

```javascript
const service = services.get('service-with-metadata');
if(service) {
  console.log(service.metadata.type);
}
```
