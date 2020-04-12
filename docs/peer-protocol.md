# Peer protocol

This document describes the protocol peers use to communicate with each other.
The protocol is based on messages and individual transports are free to
implement encoding and decoding of these as needed. A binary protocol is made
available in the library as used by the TCP transport.

## Negotiation

When two peers connect to each other they must first negotiate how to
communicate. This is done via a stage where capabilities are first negotiated
followed by the authentication of the peers against each other.

In this document `S` is used to refer to the server, which is the peer that
receives an incoming connection from another peer. `C` is used to refer to the
client, which is the peer that initiates a connection.

### Initial hello

When an incoming connection is received the server will send an initial `HELLO`
to the client. In this hello the server will indicate which capabilities it
supports. The client is then expected to pick out the capabilities it needs
and reply with these using a `SELECT` message. When the server has received 
the capabilities it will reply with a simple `OK`.

```
S: HELLO ServerId Capabilities[]
C: SELECT ClientId Capabilities[]
S: OK
```

After this step the client is expected to send an authentication request when
it receives the OK.

#### Message types

```typescript
interface HelloMessage {
  id: NodeId;
  capabilities: Capability[];
}

interface SelectMessage {
  id: NodeId;
  capabilities: Capability[];
}
```

### Authentication

Authentication is done via a few messages that delegate most of their work
to authentication providers.

The client starts the authentication process by sending an `AUTH` message
containing the authentication method it wants and the associated data for that
method. Depending on the method a few things will then happen:

1. 
   The method is unknown. The server will reply with `REJECT` and an error
   message.

2. 
   The provider for the method rejects the data. The server will then reply
   with `REJECT` containing an error message.

3.
   The provider for the method needs more data. The server will reply with
   `AUTHDATA` and data as defined by the provider. The client should provide
   its provider with the data and then proceed to send another `AUTHDATA` 
   containing the providers reply to the data.

4.
   The provider approves the authentication. The server will reply with `OK`.

Flow with data exchanges:

```
C: AUTH Method Data
S: AUTHDATA Data
C: AUTHDATA Data
S: OK
```

#### Message types

```typescript
interface AuthMessage {
  method: string;
  data: Buffer;
}

interface AuthDataMessage {
  data: Buffer;
}
```

### Finish the negotiation

When the client receives the `OK` from the authentication it is expected to
send a `BEGIN` to indicate that it is ready to handle other messages.

```
C: BEGIN
```

## Sending pings

To help with detecting when a peer becomes unresponsive it is expected that
both the server and the client send pings for as long as the session lasts.
Pings are sent every 30 seconds by default. Both the client and the server
may disconnect a peer if it does not receive a ping within an acceptable time
frame.

```
S: PING
C: PONG
```

### Message types

```typescript
type PingMessage = void;

type PongMessage = void;
```

## Graceful disconnection

Both the client and the server may send a `BYE` message to indicate that they
want to be disconnected. This may done at any point including during initial
negotiation.

```
C/S: BYE
```

### Message types

```typescript
type ByeMessage = void;
```

## Topology

To support a mesh network and routing the peers need to exchange information
about the topology of the network. To do this peers keep track of the nodes
they can see and the peers of those nodes. This information is used to create
a graph of how all the nodes are reachable.

A peer is required to keep track of the peers it directly connects to. When
a peer connects or disconnects to another peer it should increment an internal
counter. This counter represents the current version and is used to synchronize
the peers.

Peers should also measure the latency to their neighbors and include this
information, see *Latency updates* for details.

When a peer's neighbors or its information about nodes and their neighbors
change it must send a `NODE_SUMMARY` message to its neighbors. This message
contains every node it currently sees, the version it sees and the current
latency:

```
P1: NODE_SUMMARY Version [ NodeId NodeRoutingVersion ]
```

When a `NODE_SUMMARY` message is seen by a peer it should request information
about those nodes it has not yet seen, or those where its version is less
than the other peers version:

```
P2: NODE_REQUEST [ NodeId, NodeId ]
P1: NODE_DETAILS [ NodeId NodeRoutingVersion [ NodeId NodeLatency ] ]
```

Note: Peers must also be able to reply to a `NODE_REQUEST` for their own
routing.

### Latency updates

Latency between peers can change and need to be propagated through the network
to allow nodes to change their preferred routing. This is done by gossiping,
where a node randomly broadcasts known latencies to one of its peers every
now and then.

Latency to neighbors is recommended to be measured using the time between
the last 5 `PING` messages and their `PONG` reply. The initial latency is
currently the time between a `HELLO` and `SELECT` from the server side and
between the `SELECT` and `OK` for a client.

Every 30 seconds or so a node should select a random peer and send latency
updates to it. These latency updates are done via a `NODE_DETAILS` message
that includes information about all nodes:

```
P: NODE_DETAILS [ NodeId NodeRoutingVersion [ NodeId NodeLatency ] ]
```

### Message types

```typescript
interface NodeSummaryMessage {
  ownVersion: number;
  nodes: NodeRoutingSummary[];
}

interface NodeRequestMessage {
  nodes: NodeId[];
}

interface NodeDetailsMessage {
  nodes: NodeRoutingDetails[];
}

interface NodeRoutingSummary {
  id: NodeId;
  version: number;
}

interface NodeRoutingDetails {
  id: NodeId;
  version: number;
  latency: number;
  neighbors: NodeWithLatency[];
}

interface NodeWithLatency {
  id: NodeId;
  latency: number;
}
```

## Message routing

The protocol can also carry additional data, that is used to pass messages
to different nodes in the network.

### Handling a DATA message

* If this is the target: OK
* If unable to forward it to target: Reject
* When forwarding, push node and id onto the path, send and:
  * If peer replies with reject: Reject
  * If peer replies with ok: Ok
  * If peer does not reply within X seconds: Reject

### Message types

```typescript
interface DataMessage {
  path: DataMessagePathEntry[];
  target: NodeId;
  
  type: string;
  data: ArrayBuffer;
}

interface DataAckMessage {
  id: number;
}

interface DataRejectMessage {
  id: number;
}

interface DataMessagePathEntry {
  node: NodeId;
  id: number;
}
```
