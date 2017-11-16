# ataraxia-tcp

TCP transport for [Ataraxia](https://github.com/aholstenson/ataraxia).

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
