import { AnonymousAuth, AuthProvider, SharedSecretAuth } from 'ataraxia';

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
