# ataraxia-tcp

TCP transport for [Ataraxia](https://github.com/aholstenson/ataraxia). This
transport discovers and automatically connects to other instances on the same
local network. Other peers are found using mDNS and DNS-SD that match the name
of the Ataraxia network.

## Usage

```
npm install ataraxia-tcp
```

```javascript
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });
net.addTransport(new TCPTransport());
net.start();
```
