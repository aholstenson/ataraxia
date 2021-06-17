import { AuthClientFlow } from './AuthClientFlow';
import { AuthProvider } from './AuthProvider';
import { AuthServerFlow, AuthServerReplyType } from './AuthServerFlow';

/**
 * Anonymous authentication. Allows anyone to connect to the network without
 * any form of authentication.
 */
export class AnonymousAuth implements AuthProvider {
	public static readonly INSTANCE = new AnonymousAuth();

	public readonly id = 'anonymous';

	public createClientFlow(): AuthClientFlow {
		return {
			initialMessage() {
				return Promise.resolve(new ArrayBuffer(0));
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
		return {
			receiveInitial(data: ArrayBuffer) {
				if(data.byteLength !== 0) {
					return Promise.resolve({
						type: AuthServerReplyType.Reject
					});
				}

				return Promise.resolve({
					type: AuthServerReplyType.Ok
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
