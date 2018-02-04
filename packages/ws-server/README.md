# ataraxia-ws-server

Server that allows clients to connect to an [Ataraxia network](https://github.com/aholstenson/ataraxia)
via websockets. This implementation uses [ws](https://github.com/websockets/ws)
to serve the websockets. Clients may use a [websocket client](https://github.com/aholstenson/ataraxia/tree/master/packages/ws-client) to
connect to the network.

## Installation

```
npm install ataraxia-ws-server
```

## Usage

```javascript
const Network = require('ataraxia');
const WebSocketServer = require('ataraxia-ws-server');

const net = new Network({ name: 'name-of-your-app-or-network' });

// Add the websocket server - see ws for options
net.addTransport(new WebSocketServer({
  port: 7000
}));

net.start()
  .then(...)
  .catch(...);
```
