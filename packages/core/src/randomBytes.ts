declare const window: any;

/**
 * Generate a given number of random bytes. This method will try to use the
 * best available source of randomness:
 *
 * * For node it uses `randomBytes` from the `crypto` module
 * * `window.crypto.getRandomValues()` is used if available
 * * Fallback to `Math.random` if the above are not available
 *
 * @param n -
 *   the number of bytes to generate
 * @returns
 *   array filled with random bytes
 */
export function randomBytes(n: number): Uint8Array {
	if(typeof window === 'undefined') {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require('crypto').randomBytes(n);
	} else {
		const crypto = window.crypto;
		const result = new Uint8Array(n);
		if(crypto && crypto.getRandomValues) {
			crypto.getRandomValues(result);
		} else {
			for(let i = 0; i < n; i++) {
				result[i] = Math.floor(Math.random() * 256);
			}
		}

		return result;
	}
}
