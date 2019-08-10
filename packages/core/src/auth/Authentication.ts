import { AuthProvider } from './AuthProvider';

export interface AuthenticationOptions {
	providers: AuthProvider[];
}

/**
 * Collection of authentication providers.
 */
export class Authentication {
	public readonly _providers: AuthProvider[];

	/**
	 * Create a new instance.
	 *
	 * @param options
	 */
	constructor(options: AuthenticationOptions) {
		this._providers = options.providers;
	}

	get providers() {
		return Array.from(this._providers);
	}

	/**
	 * Get a provider using an identifier.
	 *
	 * @param id
	 */
	public getProvider(id: string): AuthProvider | null {
		for(const provider of this._providers) {
			if(provider.id === id) {
				return provider;
			}
		}

		return null;
	}
}
