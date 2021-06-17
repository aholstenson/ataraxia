# ataraxia-services

[![npm version](https://img.shields.io/npm/v/ataraxia-services)](https://www.npmjs.com/package/ataraxia-services)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-services)](https://libraries.io/npm/ataraxia-services)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--services-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_services.html)

Services with RPC and events for an [Ataraxia](https://github.com/aholstenson/ataraxia)
network.

* Based around **well-defined contracts**, making what a service supports very clear
* **Register** services, allowing them to be consumed anywhere in the network
* **Access services** via identifiers or events
* Listen for when services **become available or unavailable** either globally or specifically on a single service
* Support for **remote events** via [Atvik](https://aholstenson.github.io/atvik/),
  letting nodes listen to events from another node
* Create **proxy objects** for a more natural way to call methods and listen to events,
  with support for type conversions and TypeScript declarations
  
## Usage

To use services on top of a network install `ataraxia-services`:

```
npm install ataraxia-services
```

Services can then be consumed and registered by creating a [Services](https://aholstenson.github.io/ataraxia/classes/ataraxia_services.services.html)
instance on top of the network:

```javascript
import { Services, ServiceContract, stringType } from 'ataraxia-services';

const net = ... // setup network with at least one transport

const services = new Services(net);

services.onServiceAvailable(service => console.log(service.id, 'is now available'));
services.onServiceUnavailable(service => console.log(service.id, 'is no longer available'));

// Join the network
await net.join();

// Join the services layer on top of the network
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
