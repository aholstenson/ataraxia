declare module '@hyperswarm/secret-stream' {
	import { Duplex } from 'stream';

	export interface NoiseSecretStreamOptions {
		keyPair?: {
			publicKey: Buffer;
			secretKey: Buffer;
		};
	}

	export default class NoiseSecretStream extends Duplex {
		public constructor(isInitiator: boolean, stream?: Duplex, options?: NoiseSecretStreamOptions);

		public publicKey: Buffer;
		public remotePublicKey: Buffer;
	}
}
