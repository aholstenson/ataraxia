# ataraxia-ws-client

Client that connects to a [Ataraxia network](https://github.com/aholstenson/ataraxia)
using a websocket. This module makes it possible for NodeJS-instances (using
`ws`) and browsers (using Webpack, Browserify, JSPM or a similar packaging tool)
to connect to a network running [websocket server](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-server).

## Installation

```
npm install ataraxia-ws-client
```

## Usage

```javascript
const Network = require('ataraxia');
const WebSocketClient = require('ataraxia-ws-client');

const net = new Network({ name: 'name-of-your-app-or-network' });

// Add the websocket client
net.addTransport(new WebSocketClient({
  url: 'ws://localhost:7000', // URL to the websocket on the server
  factory: window.WebSocket // If used in a browser, for Node use require('ws')
}));

net.start()
  .then(...)
  .catch(...);
```
