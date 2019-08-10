# ataraxia-ws-client

[![npm version](https://badge.fury.io/js/ataraxia-ws-client.svg)](https://badge.fury.io/js/ataraxia-ws-client)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/ws-client)](https://david-dm.org/aholstenson/ataraxia?path=packages/ws-client)

Client that connects to a [Ataraxia network](https://github.com/aholstenson/ataraxia)
using a websocket. This module makes it possible for NodeJS-instances (using
`ws`) and browsers to connect to a network running [websocket server](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-server).

## Installation

```
npm install ataraxia-ws-client
```

## Usage

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { WebSocketClientTransport } from 'ataraxia-ws-client';

// Setup a network with anonymous authentication
const net = new Network({
  name: 'name-of-your-app-or-network',
  authentication: [
    new AnonymousAuth()
  ]
});

// Add the websocket client
net.addTransport(new WebSocketClientTransport({
  // URL to the websocket on the server
  url: 'ws://localhost:7000',
  // If using outside a browser, define how a WebSocket is created
  factory: url => new WebSocket(url)
}));

net.start()
  .then(...)
  .catch(...);
```
