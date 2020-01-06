import { Encoder, Decoder } from '@stablelib/cbor';
import { hmac } from 'fast-sha256';
import { TextEncoder } from 'fastestsmallesttextencoderdecoder';

import { AuthProvider } from './AuthProvider';
import { AuthClientFlow } from './AuthClientFlow';
import { AuthServerFlow, AuthServerReplyType } from './AuthServerFlow';

export interface SharedSecretAuthOptions {
	secret: ArrayBuffer | string;
}

/**
 * Shared secret authentication. Allows access to the network if both the
 * client and the server has access to the same secret.
 */
export class SharedSecretAuth implements AuthProvider {
	public readonly id = 'shared-secret';

	private readonly secret: ArrayBuffer;

	constructor(options: SharedSecretAuthOptions) {
		if(typeof options.secret === 'string') {
			const encoder = new TextEncoder();
			this.secret = encoder.encode(options.secret);
		} else {
			this.secret = options.secret;
		}
	}

	public createClientFlow(): AuthClientFlow {
		const secret = this.secret;
		const challenge = randomBytes(32);
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
				const calculatedResponse = calculateResponse(secret, challenge);
				if(! isEqual(serverResponse, calculatedResponse)) {
					throw new Error('Server did not correctly verify its identity, check that the same secret is in use');
				}

				// Calculate our response to the servers challenge
				const response = calculateResponse(secret, serverChallenge);
				const encoder = new Encoder();
				encoder.encodeBytes(response);
				return encoder.finish().buffer;
			},

			destroy() {
				return Promise.resolve();
			}
		};
	}

	public createServerFlow(): AuthServerFlow {
		const secret = this.secret;
		const challenge = randomBytes(32);
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
				const response = calculateResponse(secret, clientChallenge);
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
				const calculatedResponse = calculateResponse(secret, challenge);
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
 */
function isEqual(o1: Uint8Array, o2: Uint8Array): boolean {
	let result = o1.byteLength === o2.byteLength;

	for(let i=0, n=Math.max(o1.length, o2.length); i<n; i++) {
		if(o1[i] !== o2[i] && result) {
			result = false;
		}
	}

	return result;
}

function calculateResponse(key: ArrayBuffer, challenge: Uint8Array) {
	return hmac(new Uint8Array(key), challenge);
}

declare const window: any;

/**
 * Generate a given number of random bytes. This method will try to use the
 * best available source of randomness:
 *
 * * For node it uses `randomBytes` from the `crypto` module
 * * `window.crypto.getRandomValues()` is used if available
 * * Fallback to `Math.random` if the above are not available
 *
 * @param n
 */
function randomBytes(n: number): Uint8Array {
	if(typeof window === 'undefined') {
		return require('crypto').randomBytes(n);
	} else {
		const crypto = window.crypto;
		const result = new Uint8Array(n);
		if(crypto && crypto.getRandomValues) {
			crypto.getRandomValues(result);
		} else {
			for(let i=0; i<n; i++) {
				result[i] = Math.floor(Math.random() * 256);
			}
		}

		return result;
	}
}
