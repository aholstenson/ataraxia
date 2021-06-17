import { Duplex } from 'stream';

import NoiseSecretStream from 'noise-secret-stream';

import { StreamingPeer } from './StreamingPeer';

/**
 * Peer that uses Node streams and automatically applies two-way encryption.
 * This delegates establishing the secure channel to `noise-secret-stream`
 * which uses [Noise Protocol Framework](https://noiseprotocol.org/) together
 * with [secret streams from libsodium](https://libsodium.gitbook.io/doc/secret-key_cryptography/secretstream).
 */
export class EncryptedStreamingPeer extends StreamingPeer {
	protected setStream(stream: Duplex, client: boolean) {
		super.setStream(
			new NoiseSecretStream(client, stream),
			client
		);
	}
}
