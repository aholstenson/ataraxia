import { AnonymousAuth, AuthProvider, SharedSecretAuth } from 'ataraxia';

/**
 * Resolve authentication to use based on command line arguments.
 *
 * @param args -
 *   parsed command line arguments
 * @returns
 *   array of auth providers
 */
export function resolveAuth(args: any): AuthProvider[] {
	const result: AuthProvider[] = [
		new AnonymousAuth()
	];

	if(args.sharedKey) {
		result.push(new SharedSecretAuth({
			secret: args.sharedKey
		}));
	}

	return result;
}
