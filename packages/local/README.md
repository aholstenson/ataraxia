# ataraxia-local

Machine-local transport for [Ataraxia](https://github.com/aholstenson/ataraxia).
This transport connects together instances on the same machine via a Unix
socket.

## Usage

```
npm install --save ataraxia-local
```

To use only the machine-local transport:

```javascript
const Network = require('ataraxia');
const LocalTransport = require('ataraxia-local');

const net = new Network({ name: 'name-of-your-app-or-network' });
net.addTransport(new LocalTransport());

net.start()
  .then(...)
  .catch(...);
```

The event `leader` can be used to start a secondary network transport that
will handle connections to other machines.

```javascript
const Network = require('ataraxia');
const LocalTransport = require('ataraxia-local');
const TCPTransport = require('ataraxia-tcp');

const net = new Network({ name: 'name-of-your-app-or-network' });

const local = new LocalTransport();
local.on('leader', () => {
  /*
   * The leader event is emitted when this instance becomes the leader
   * of the machine-local network. This instance will now handle
   * connections to other machines in the network.
   */
  net.addTransport(new TCPTransport());
});
net.addTransport(local);

net.start()
  .then(...)
  .catch(...);
```
