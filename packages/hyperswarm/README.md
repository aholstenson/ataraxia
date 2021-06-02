# ataraxia-hyperswarm

[![npm version](https://badge.fury.io/js/ataraxia-hyperswarm.svg)](https://badge.fury.io/js/ataraxia-hyperswarm)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/hyperswarm)](https://david-dm.org/aholstenson/ataraxia?path=packages/hyperswarm)

Hyperswarm transport for [Ataraxia](https://github.com/aholstenson/ataraxia). 
This transport discovers and connects to peers using a specific topic via the
public Internet using [Hyperswarm](https://github.com/hyperswarm/hyperswarm).

## Installation

```
npm install ataraxia-hyperswarm
```

## Usage

Create a transport that will connect to and discover peers based on a specific
topic:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { HyperswarmTransport } from 'ataraxia-hyperswarm';

// Setup a network over Hyperswarm
const net = new Network({
  name: 'name-of-your-app-or-network',

  transports: [

    new HyperswarmTransport({
      // Topic used to find peers
      topic: 'Unique Topic',

      // Setup anonymous authentication
      authentication: [
        new AnonymousAuth()
      ]
    })

  ]
});

// Start the network
await net.start();
```

## API

* `new HyperswarmTransport(options)`

  Create a new instance of this transport.

  * `options`
    * `topic: string`, topic used to discover peers. The transport will attempt
      to connect to other peers using the same topic so making it unique to your
      app or use case is important.
    * `authentication: AuthProvider[]`, providers to use for authentication of
      found peers.
