# ataraxia-ws-client

[![npm version](https://img.shields.io/npm/v/ataraxia-ws-client)](https://www.npmjs.com/package/ataraxia-ws-client)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-ws-client)](https://libraries.io/npm/ataraxia-ws-client)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--ws--client-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_ws_client.html)

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

// Setup a network with a WebSocket client
const net = new Network({
  name: 'name-of-your-app-or-network',

  transports: [
  
    new WebSocketClientTransport({
      // URL to the websocket on the server
      url: 'ws://localhost:7000',
      // If using outside a browser, define how a WebSocket is created
      factory: url => new WebSocket(url),
      // Use anonymous authentication
      authentication: [
        new AnonymousAuth()
      ]
    })

  ]
});

await net.join();
```

## API

* `new WebSocketClientTransport(options)`

  Create a new instance of this transport.

  * `options`
    * `url: string`, the URL to connect to, this will be where a `WebSocketServerTransport` 
      is running. 
    * `factory?: (url) => WebSocket`, factory used to create a `WebSocket` instance,
      used to support running both in a browser and in Node via libraries such as `ws`.
    * `authentication: AuthProvider[]`, array containing all of the authentication
      methods supported. 
