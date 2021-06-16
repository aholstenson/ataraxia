# ataraxia-services

[![npm version](https://img.shields.io/npm/v/ataraxia-services)](https://www.npmjs.com/package/ataraxia-services)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-services)](https://libraries.io/npm/ataraxia-services)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--services-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_services.html)

Services with RPC and events for [Ataraxia](https://github.com/aholstenson/ataraxia).

This project provides a service layer on top of a Ataraxia network and allows
nodes to easily register services and to call methods and receive events on
services on other nodes.

## Usage

```
npm install ataraxia-services
```

```javascript
import { Services, ServiceContract, serviceContract, stringType } from 'ataraxia-services';

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

// Services can be fetched using their id, and may or may not be available
const echoService = services.get('service-id');

// Contracts can be used to create a callable proxy
const callableEchoService = echoService.as(EchoService);
await callableEchoService.echo('message');

// Implementations can be plain objects
const handle = services.register('service-id', EchoService.implement({
  echo(message) {
    return Promise.resolve(message);
  }
}));

// Implementations may also be classes - which can be decorated
@serviceContract(EchoService)
class EchoServiceImpl {
  echo(message) {
    return Promise.resolve(message);
  }
}
services.register('service-id', new EchoServiceImpl());

@serviceContract(EchoService)
class EchoServiceImpl {
  serviceId = 'echo';
  
  echo(message) {
    return Promise.resolve(message);
  }
}
```
