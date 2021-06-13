import { Encoder, Decoder } from '@stablelib/cbor';
import { hmac } from 'fast-sha256';

import { randomBytes } from '../randomBytes';

import { AuthClientFlow, AuthClientReplyType } from './AuthClientFlow';
import { AuthContext } from './AuthContext';
import { AuthProvider } from './AuthProvider';
import { AuthServerFlow, AuthServerReplyType } from './AuthServerFlow';

/**
 * Options for `SharedSecretAuth`. Used to provide the shared secret.
 */
export interface SharedSecretAuthOptions {
	/**
	 * Secret that is shared. If this secret is a string it will be encoded
	 * into a byte representation.
	 */
	secret: ArrayBuffer | string;
}

/**
 * Shared secret authentication. Allows access to the network if both the
 * client and the server has access to the same secret.
 */
export class SharedSecretAuth implements AuthProvider {
	public readonly id = 'shared-secret';

	private readonly secret: ArrayBuffer;

	public constructor(options: SharedSecretAuthOptions) {
		if(typeof options.secret === 'string') {
			const encoder = createTextEncoder();
			this.secret = encoder.encode(options.secret);
		} else {
			this.secret = options.secret;
		}
	}

	public createClientFlow(context: AuthContext): AuthClientFlow {
		const secret = this.secret;
		const challenge = randomBytes(16);
		return {
			async initialMessage() {
				const encoder = new Encoder();

				// Version indicator
				encoder.encodeInteger(1);

				// Challenge
				encoder.encodeBytes(new Uint8Array(challenge));

				// Return the initial message
				return encoder.finish().buffer;
			},

			async receiveData(data) {
				const decoder = new Decoder(new Uint8Array(data), {
					ignoreExtraData: true
				});

				const version = decoder.decode();
				if(version !== 1) {
					throw new Error('Unknown version');
				}

				const serverChallenge: Uint8Array = decoder.decode();
				const serverResponse: Uint8Array = decoder.decode();

				// Calculate what the expected response is and compare them
				const calculatedResponse = calculateResponse(secret, challenge, context.remotePublicSecurity);
				if(! isEqual(serverResponse, calculatedResponse)) {
					return {
						type: AuthClientReplyType.Reject
					};
				}

				// Calculate our response to the servers challenge
				const response = calculateResponse(secret, serverChallenge, context.localPublicSecurity);
				const encoder = new Encoder();
				encoder.encodeBytes(response);
				return {
					type: AuthClientReplyType.Data,
					data: encoder.finish().buffer
				};
			},

			destroy() {
				return Promise.resolve();
			}
		};
	}

	public createServerFlow(context: AuthContext): AuthServerFlow {
		const secret = this.secret;
		const challenge = randomBytes(16);
		return {
			async receiveInitial(data: ArrayBuffer) {
				const decoder = new Decoder(new Uint8Array(data), {
					ignoreExtraData: true
				});

				const version = decoder.decode();
				if(version !== 1) {
					return {
						type: AuthServerReplyType.Reject
					};
				}

				const clientChallenge = decoder.decode();

				const encoder = new Encoder();

				// Version indicator
				encoder.encodeInteger(1);

				// Challenge
				encoder.encodeBytes(challenge);

				// Challenge reply
				const response = calculateResponse(secret, clientChallenge, context.remotePublicSecurity);
				encoder.encodeBytes(response);

				// Return the initial message
				return {
					type: AuthServerReplyType.Data,

					data: encoder.finish().buffer
				};
			},

			async receiveData(data) {
				const decoder = new Decoder(new Uint8Array(data), {
					ignoreExtraData: true
				});

				const clientResponse: Uint8Array = decoder.decode();

				// Calculate what the expected response is and compare them
				const calculatedResponse = calculateResponse(secret, challenge, context.localPublicSecurity);
				if(! isEqual(clientResponse, calculatedResponse)) {
					return {
						type: AuthServerReplyType.Reject
					};
				}

				return {
					type: AuthServerReplyType.Ok
				};
			},

			destroy() {
				return Promise.resolve();
			}
		};
	}
}

/**
 * Check if two buffers are equal. This will always loop through all bytes
 * and does not short circuit so that the timing of calls are as similar as
 * possible.
 *
 * @param o1 -
 *   the first array
 * @param o2 -
 *   the second array
 * @returns
 *   if the arrays are equal
 */
function isEqual(o1: Uint8Array, o2: Uint8Array): boolean {
	let result = o1.byteLength === o2.byteLength;

	for(let i = 0, n = Math.max(o1.length, o2.length); i < n; i++) {
		if(o1[i] !== o2[i] && result) {
			result = false;
		}
	}

	return result;
}

/**
 * Calculate a response based on a given challenge.
 *
 * @param key -
 *   the shared key
 * @param challenge -
 *   challenge sent by the other side
 * @param security -
 *   optional security information such a public key, can be provided by the
 *   transport layer to protect against MiTM attacks.
 * @returns
 *   calculated response to send back
 */
function calculateResponse(
	key: ArrayBuffer,
	challenge: Uint8Array,
	security: ArrayBuffer | undefined
) {
	let combinedChallenge;
	if(security) {
		combinedChallenge = new Uint8Array(challenge.length + security.byteLength);
		combinedChallenge.set(challenge);
		combinedChallenge.set(new Uint8Array(security), challenge.length);
	} else {
		combinedChallenge = challenge;
	}

	return hmac(new Uint8Array(key), combinedChallenge);
}

/**
 * Utility function to create a TextEncoder.
 *
 * @returns
 *   instance of TextEncoder
 */
function createTextEncoder(): any {
	const a = globalThis as any;
	if(typeof a.TextEncoder === 'undefined') {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { TextEncoder } = require('util');
		return new TextEncoder();
	} else {
		return new a.TextEncoder();
	}
}
