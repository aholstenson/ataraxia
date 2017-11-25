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
service.hello()
  .then(result => console.log('service said', result))
  .catch(handleErrorCorrectlyHere);

service.on('hello', data => console.log('got', data));
```

## Creat
