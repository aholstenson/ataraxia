Ataraxia is mesh networking library with peer-to-peer messaging for NodeJS and
the browser. Ataraxia connects different instances together and allows messages
to be passed between these instances. Some instances may act as routers for 
other instances to create a mesh network.

[![npm version](https://img.shields.io/npm/v/ataraxia)](https://www.npmjs.com/package/ataraxia)

Ataraxia is split into several projects:

* {@link ataraxia} is the main library that provides the messaging functionality
* {@link ataraxia-local} provides a machine-local transport
* {@link ataraxia-tcp} provides a TCP-based transport with local network discovery
* {@link ataraxia-hyperswarm} provides a Hyperswarm-based transport over the public Internet
* {@link ataraxia-ws-client} provides a websocket client
* {@link ataraxia-ws-server} provides a websocket server
* {@link ataraxia-services} provides easy-to-use services with RPC and events

## Features

* Instances can send and receive messages from other instances
* Partially connected mesh network, messages will be routed to their target
* Authentication support, anonymous and shared secret authentication available in core
* RPC support via {@link ataraxia-services} that lets you call methods and receive events from services registered anywhere in the network
* Support for different transports
  * {@link ataraxia-local} provides a machine-local transport
  * {@link ataraxia-tcp} provides a TCP-based transport with customizable discovery of peers and encrypted connections
  * {@link ataraxia-ws-client} and {@link ataraxia-ws-server} for websockets
  * {@link ataraxia-hyperswarm} provides a transport that uses Hyperswarm to connect to peers over the public Internet
