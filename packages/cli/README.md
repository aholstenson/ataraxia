# ataraxia-cli

[![npm version](https://badge.fury.io/js/ataraxia-cli.svg)](https://badge.fury.io/js/ataraxia-cli)
[![Dependencies](https://david-dm.org/aholstenson/ataraxia/status.svg?path=packages/cli)](https://david-dm.org/aholstenson/ataraxia?path=packages/cli)

Command-cline to help with debugging an [Ataraxia](https://github.com/aholstenson/ataraxia)
network.

## Installation

Install via NPM:

```
npm install -g ataraxia-cli
```

## Usage

### Inspecting the network

Inspecting the network can be done with the `inspect` command. This will
show nodes as they become available or unavailable. The command will exit
after 5 seconds of no inactivity or after 60 seconds. Use `--watch` to keep
it running.

Example:

```
$ ataraxia --network nameOfNetwork inspect
  INFO  Joining example as GpTYSnv4AX
 Available  GpJFRewg7q
 Available  GpM2xb78yP
```

### Listen to messages

Listening and printing messages can be done via the `listen` command.

```
$ ataraxia --network nameOfNetwork listen
$ ataraxia --network nameOfNetwork listen --exchange counter
```

### Picking networks to join

Option                     | Description
===========================|====================================
`--network networkName`    | Join machine-local network and TCP network using mDNS discovery
`--hyperswarm topic`       | Discover peers via the given Hyperswarm topic
`--sharedKey key`          | Enable shared-key authentication
