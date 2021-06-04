import { Network } from 'ataraxia';
import { MachineLocalTransport } from 'ataraxia-local';
import { TCPTransport, TCPPeerMDNSDiscovery } from 'ataraxia-tcp';
import { HyperswarmTransport } from 'ataraxia-hyperswarm';

import { logInfo } from '../log';

import { resolveAuth } from './resolveAuth';
import { stopNetwork } from './stopNetwork';

export function createNetwork(args: any): Network {
	const auth = resolveAuth(args);

	const net = new Network({
		name: args.network as string ?? 'ataraxia-cli',
		endpoint: true,

		transports: [
			new MachineLocalTransport(),

			new TCPTransport({
				discovery: new TCPPeerMDNSDiscovery(),
				authentication: auth
			})
		]
	});

	if(args.hyperswarm) {
		net.addTransport(new HyperswarmTransport({
			topic: args.hyperswarm,
			authentication: auth
		}))
	}

	// Add a hook that stops the process when the network stops
	process.on('SIGINT', () => {
		logInfo('Shutting down network');
		stopNetwork(net)
	});

	return net;
}
