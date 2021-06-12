# ataraxia-local

[![npm version](https://img.shields.io/npm/v/ataraxia-local)](https://www.npmjs.com/package/ataraxia-local)
[![Dependencies](https://img.shields.io/librariesio/release/npm/ataraxia-local)](https://libraries.io/npm/ataraxia-local)
[![Typedoc](https://img.shields.io/badge/typedoc-ataraxia--local-%23fff)](https://aholstenson.github.io/ataraxia/modules/ataraxia_local.html)

Machine-local transport for [Ataraxia](https://github.com/aholstenson/ataraxia).
This transport connects together instances on the same machine via a Unix
socket.

## Usage

```
npm install --save ataraxia-local
```

To use only the machine-local transport:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { MachineLocalTransport } from 'ataraxia-local';

// Setup a network
const net = new Network({
  name: 'name-of-your-app-or-network',

  transports: [
    new MachineLocalTransport()
  ]
});

await net.join();
```

`onLeader` can be used to start a secondary network transport that
will handle connections to other machines:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
import { MachineLocalTransport } from 'ataraxia-local';

// Setup a network
const net = new Network({
  name: 'name-of-your-app-or-network',
});

net.addTransport(new MachineLocalTransport([
  onLeader: () => {
    /*
    * The leader event is emitted when this instance becomes the leader
    * of the machine-local network. This instance will now handle
    * connections to other machines in the network.
    */
    net.addTransport(new TCPTransport({
      discovery: new TCPPeerMDNSDiscovery(),

      authentication: [
        new AnonymousAuth()
      ]
    }));
  }
]);

await net.join();
```

## API

* `new MachineLocalTransport(options)`

  Create a new instance of the transport.

  * `options`
    * `path?: string`, path of the local socket. If not specified the transport 
      defaults to creating a socket in the temporary directory of the system 
      using the name of the network.
    * `onLeader?: () => void`, function that will be run if this instance 
      becomes the leader of the local network.

* `onLeader(callback: () => void)`

  Event emitted if this transport becomes the leader of the local network.
