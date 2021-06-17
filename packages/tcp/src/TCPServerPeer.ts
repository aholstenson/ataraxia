import { Socket, } from 'net';

import {
	AuthProvider,
	TransportOptions
} from 'ataraxia-transport';
import { EncryptedStreamingPeer } from 'ataraxia-transport-streams';

/**
 * Peer for TCP transport, used when representing an incoming connection
 * from a client.
 */
export class TCPServerPeer extends EncryptedStreamingPeer {
	public constructor(
		transportOptions: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>,
		socket: Socket
	) {
		super(transportOptions, authProviders);

		this.debug('Client connected from', socket.remoteAddress);

		// Use this connection if there is no other connection active
		this.setStream(socket, false);
	}
}
