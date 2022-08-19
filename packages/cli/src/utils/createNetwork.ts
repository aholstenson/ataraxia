import { Network } from 'ataraxia';
import { HyperswarmTransport } from 'ataraxia-hyperswarm';
import { MachineLocalTransport } from 'ataraxia-local';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';

import { logInfo } from '../log.js';

import { resolveAuth } from './resolveAuth.js';
import { stopNetwork } from './stopNetwork.js';

/**
 * Create a network based on command line arguments.
 *
 * @param args -
 *   parsed command line arguments
 * @returns
 *   network
 */
export function createNetwork(args: any): Network {
	const auth = resolveAuth(args);

	const net = new Network({
		name: args.network as string ?? 'ataraxia-cli',
		endpoint: true,
	});

	if(args.network) {
		net.addTransport(new MachineLocalTransport());

		net.addTransport(new TCPTransport({
			discovery: new TCPPeerMDNSDiscovery(),
			authentication: auth
		}));
	}

	if(args.hyperswarm) {
		net.addTransport(new HyperswarmTransport({
			topic: args.hyperswarm,
			authentication: auth
		}));
	}

	// Add a hook that stops the process when the network stops
	process.on('SIGINT', () => {
		logInfo('Shutting down network');
		stopNetwork(net);
	});

	return net;
}
