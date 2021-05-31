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

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network',
  authentication: [
    new AnonymousAuth()
  ]
});

// Setup a Hyperswarm transport connecting to every other peer with the same topic
net.addTransport(new HyperswarmTransport({
  topic: 'Unique Topic'
}));

// Start the network
net.start()
  .then(...)
  .catch(...);
```
