# ataraxia-service-contracts

[![npm version](https://img.shields.io/npm/v/ataraxia-service-contracts)](https://www.npmjs.com/package/ataraxia-service-contracts)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-service-contracts)](https://libraries.io/npm/ataraxia-service-contracts)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--service--contracts-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_service_contracts.html)

Light-weight service contracts for defining how services act. Used for RPC
in [Ataraxia](https://github.com/aholstenson/ataraxia).

This library is provided as a way to define contracts for services that may
be used with Ataraxia, but do not necessarily register or consume them on their
own. If you're interested in registering or consuming services [ataraxia-services](https://github.com/aholstenson/ataraxia/tree/master/packages/services) is what you want to depend on.

## Usage

To get started install the `ataraxia-service-contracts` library:

```
npm install ataraxia-service-contracts
```

Contracts can then be defined using the [ServiceContract](https://aholstenson.github.io/ataraxia/classes/ataraxia_service_contracts.servicecontract.html)
class:

```javascript
import { ServiceContract } from 'ataraxia-service-contracts';

const EchoService = new ServiceContract()
  .defineMethod('echo', {
     returnType: stringType,
     parameters: [
       {
          name: 'message',
          type: stringType
       }
     ]
  })
  .defineEvent('onEcho', {
    parameters: [
       {
          name: 'message',
          type: stringType
       }
    ]
  });
```

Or together with TypeScript:

```typescript
import { ServiceContract, AsyncSubscribable } from 'ataraxia-service-contracts';

interface EchoService {
  onEcho: AsyncSubscribable<this, [ message: string ]>;

  echo(message: string): Promise<string>;
}

const EchoService = new ServiceContract<EchoService>()
  .defineMethod('echo', {
     returnType: stringType,
     parameters: [
       {
          name: 'message',
          type: stringType
       }
     ]
  })
  .defineEvent('onEcho', {
    parameters: [
       {
          name: 'message',
          type: stringType
       }
    ]
  });
```

## Using contracts in classes

When using classes the recommended way to mark what contract a class implements 
is to use the serviceContract decorator:

```javascript
@serviceContract(EchoService)
class EchoServiceImpl {
  async echo(message) {
     return message;
  }
}
```

If the decorator is not used you can define a static property called serviceContract instead:

```javascript
class EchoServiceImpl {
  static serviceContract = EchoService;

  async echo(message) {
     return message;
  }
}
```

Contracts will traverse the prototype chain, so defining contract on extended classes work well:

```javascript
@serviceContract(EchoService)
class AbstractEchoService {
  async echo(message) {
     return message;
  }
}

class EchoServiceImpl extends AbstractEchoService {
}
```

## Using contracts with objects

For plain objects the easiest way to use a contract is to use implement:

```javascript
const instance = EchoService.implement({
  async echo(message) {
    return message;
  }
});
```

As with classes a property may be used instead:

```javascript
const instance = {
  serviceContract: EchoService,

  async echo(message) {
    return message;
  }
};
```
