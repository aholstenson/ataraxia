import { Socket, } from 'net';

import { WithNetwork, AuthProvider } from 'ataraxia';
import { EncryptedStreamingPeer } from 'ataraxia/transport';

/**
 * Peer for TCP transport, used when representing an incoming connection
 * from a client.
 */
export class TCPServerPeer extends EncryptedStreamingPeer {
	public constructor(
		network: WithNetwork,
		authProviders: ReadonlyArray<AuthProvider>,
		socket: Socket
	) {
		super(network, authProviders);

		this.debug('Client connected from', socket.remoteAddress);

		// Use this connection if there is no other connection active
		this.setStream(socket, false);
	}
}
