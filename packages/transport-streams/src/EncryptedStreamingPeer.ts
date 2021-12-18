import { Duplex } from 'stream';

import NoiseSecretStream from '@hyperswarm/secret-stream';

import { StreamingPeer } from './StreamingPeer';

/**
 * Peer that uses Node streams and automatically applies two-way encryption.
 * This delegates establishing the secure channel to `noise-secret-stream`
 * which uses [Noise Protocol Framework](https://noiseprotocol.org/) together
 * with [secret streams from libsodium](https://libsodium.gitbook.io/doc/secret-key_cryptography/secretstream).
 */
export class EncryptedStreamingPeer extends StreamingPeer {
	private secretStream?: NoiseSecretStream;

	protected setStream(stream: Duplex, client: boolean) {
		this.secretStream = new NoiseSecretStream(client, stream);
		super.setStream(
			this.secretStream,
			client
		);
	}

	protected localPublicSecurity(): ArrayBuffer | undefined {
		return this.secretStream?.publicKey;
	}

	protected remotePublicSecurity(): ArrayBuffer | undefined {
		return this.secretStream?.remotePublicKey;
	}
}
