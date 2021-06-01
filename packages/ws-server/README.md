# ataraxia-ws-server

[![npm version](https://badge.fury.io/js/ataraxia-ws-server.svg)](https://badge.fury.io/js/ataraxia-ws-server)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/ws-server)](https://david-dm.org/aholstenson/ataraxia?path=packages/ws-server)

Server that allows clients to connect to an [Ataraxia network](https://github.com/aholstenson/ataraxia)
via websockets. This implementation uses [ws](https://github.com/websockets/ws)
to serve the websockets. Clients may use a [websocket client](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-client)
to connect to the network.

## Installation

```
npm install ataraxia-ws-server
```

## Usage

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { WebSocketServerTransport } from 'ataraxia-ws-server';

// Setup a network with a WebSocket server
const net = new Network({
  name: 'name-of-your-app-or-network',

  transport: [

    new WebSocketServerTransport({
      port: 7000,

      authentication: [
        new AnonymousAuth()
      ]
    })

  ]
});

await net.start();
```
