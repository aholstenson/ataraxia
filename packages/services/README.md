# ataraxia-services

[![npm version](https://badge.fury.io/js/ataraxia-services.svg)](https://badge.fury.io/js/ataraxia-services)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/services)](https://david-dm.org/aholstenson/ataraxia?path=packages/services)

Services with RPC and events for [Ataraxia](https://github.com/aholstenson/ataraxia).

This project provides a service layer on top of a Ataraxia network and allows
nodes to easily register services and to call methods and receive events on
services on other nodes.

## Usage

```
npm install ataraxia-services
```

```javascript
import { Services } from 'ataraxia-services';

const net = ... // setup network with at least one transport

const services = new Services(net);

services.onServiceAvailable(service => console.log(service.id, 'is now available'));
services.onServiceUnavailable(service => console.log(service.id, 'is no longer available'));

// Join the network
await net.join();

// Start the services on top of the network
await services.start();

// Register a service as a plain object
const handle = services.register({
  id: 'service-id',
  
  hello() {
    return 'Hello world';
  }
});

// Classes can be registered and created
services.register(class Test {
  constructor(handle) {
    this.handle = handle;

    this.id = 'service-id';
  }

  hello() {
    return 'Hello World';
  }
})

// Interact with services
const service = services.get('service-id');
if(service) {
  console.log('Service found', service);

  // Call functions on the service
  const reply = await service.hello();
}
```

## Events

`ataraxia-services` supports emitting and listening to events. The support for
events is designed to be used via [Atvik](https://github.com/aholstenson/atvik).

```javascript
import { Event } from 'atvik';

class TestService {
  constructor(handle) {
    this.id = 'test';

    this.helloEvent = new Event(this);
  }

  get onHello() {
    // This onX method makes the event available on the service
    return this.helloEvent.subscribable;
  }

  sayHello(message) {
    // Emit an event
    this.helloEvent.emit(message);

    // Return a result
    return 'Hello ' + message + '!';
  }
}

// Register the service
services.register(TestService);

// Get the service either on the same node or another node
const service = services.get('test');

// Listen to the event
const handle = await service.onHello(message => console.log('Service emitted hello event:', message));

// Call the method to emit the event
await service.sayHello('World');

// Unsubscribe from event
await handle.unsubscribe();
```
