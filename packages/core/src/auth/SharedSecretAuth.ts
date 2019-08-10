import { AuthProvider } from './AuthProvider';
import { AuthClientFlow } from './AuthClientFlow';
import { AuthServerFlow, AuthServerReplyType } from './AuthServerFlow';

export interface SharedSecretAuthOptions {
	secret: ArrayBuffer;
}

/**
 * Shared secret authentication. Allows access to the network if both the
 * client and the server has access to the same secret.
 */
export class SharedSecretAuth implements AuthProvider {
	public readonly id = 'shared-secret';

	private readonly secret: ArrayBuffer;

	constructor(options: SharedSecretAuthOptions) {
		this.secret = options.secret;
	}

	public createClientFlow(): AuthClientFlow {
		const secret = this.secret;
		return {
			initialMessage() {
				return Promise.resolve(secret);
			},

			receiveData() {
				return Promise.reject();
			},

			destroy() {
				return Promise.resolve();
			}
		};
	}

	public createServerFlow(): AuthServerFlow {
		const secret = this.secret;
		return {
			receiveInitial(data: ArrayBuffer) {
				return Promise.resolve({
					type: isEqual(secret, data) ? AuthServerReplyType.Ok : AuthServerReplyType.Reject
				});
			},

			receiveData() {
				return Promise.reject();
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
function isEqual(o1: ArrayBuffer, o2: ArrayBuffer): boolean {
	let result = o1.byteLength === o2.byteLength;

	const u1 = new Uint8Array(o1);
	const u2 = new Uint8Array(o2);
	for(let i=0, n=Math.max(u1.length, u2.length); i<n; i++) {
		if(u1[i] !== u2[i] && result) {
			result = false;
		}
	}

	return result;
}
