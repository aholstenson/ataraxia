Connect nodes, such as NodeJS-apps or browsers, together and send messages 
between them. Provides a mesh network with peer-to-peer messaging, allowing
messages to be routed between nodes that are not directly connected with each
other.

* Instances can **send and receive messages** from other instances
* Partially connected **mesh network**, messages will be routed to their target if needed
* **Authentication support**, {@link AnonymousAuth anonymous} and {@link SharedSecretAuth shared secret} authentication available in core
* **Encryption**, most transports establish an encrypted connection by default
* **RPC**,  register and consume services anywhere in the network, supports method call and events, via {@link ataraxia-services}
* Support for **different transports**
  * {@link MachineLocalTransport Machine-local transport}, connect to NodeJS-instances on the local machine 
  * {@link TCPTransport TCP-based transport} with customizable discovery of peers, {@link TCPPeerMDNSDiscovery mDNS} included for discovery on the local network
  * Websockets, both {@link WebSocketServerTransport server-side} and 
    {@link WebSocketClientTransport client-side} variants
  * {@link HyperswarmTransport Hyperswarm} to find and connect to peers over the public Internet

## Getting started

To setup your own network install the `ataraxia` package and at least one
transport such as `ataraxia-tcp`:

```
$ npm install ataraxia ataraxia-tcp
```

A network can then be created and joined:

```javascript
import { Network, AnonymousAuth } from 'ataraxia';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

const net = new Network({
  name: 'ataraxia-example',
  transports: [
    new TCPTransport({
      discovery: new TCPPeerMDNSDiscovery(),
      authentication: [
        new AnonymousAuth()
      ]
    })
  ]
});

net.onNodeAvailable(node => {
  console.log('A new node is available:', node.id);
  node.send('hello')
    .catch(err => console.log('Unable to send hello'));
});

net.onMessage(msg => {
  console.log('A message was received', msg.type, 'with data', msg.data, 'from', msg.source.id);
});

// Join the network
await net.join();
```
