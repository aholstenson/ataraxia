# ataraxia-ws-server

[![npm version](https://img.shields.io/npm/v/ataraxia-ws-server)](https://www.npmjs.com/package/ataraxia-ws-server)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-ws-server)](https://libraries.io/npm/ataraxia-ws-server)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--ws--server-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_ws_server.html)

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

await net.join();
```

## API

* 
  `new WebSocketServerTransport(options)` 
  
  Create a new transport using the given options.

  * `options`
    * `host?: string`, hostname where to bind the server.
    * `port?: number`, port where to bind the server.
    * `authentication:  AuthProvider[]`, array of authentication providers.
    * `backlog?: number`, maximum length of the queue of pending connections.
    * `server?: http.Server | https.Server`, pre-created Node.js HTTP/S server.
    * `verifyClient?: function`, a function which can be used to validate incoming connections. See WS docs for details.
    * `handleProtocols?: function`, a function which can be used to handle the WebSocket subprotocols. See WS docs for details.
    * `noServer?: boolean`, enable no server mode.
    * `clientTracking?: boolean`, specifies whether or not to track clients.
    * `perMessageDeflate: boolean|object`, enable/disable permessage-deflate. See WS docs for details.
    * `maxPayload: number`, the maximum allowed message size in bytes.


  `WebSocketServerTransport` extends the options of [WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback). Detailed description of many of these
  options can be find in its documentation.

