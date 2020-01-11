/**
 * Context information that can be used during authentication. Used to pass in
 * extra information that a `AuthProvider` may use if needed.
 */
export interface AuthContext {

	/**
	 * An optional buffer representing a publicly known security challenge.
	 * For TLS this can be the hash of the certificate used by the local
	 * transport.
	 */
	localPublicSecurity?: ArrayBuffer;

	/**
	 * An optional buffer representing a publicly known security challenge
	 * from the remote peer. For TLS this can be the hash of the certificate
	 * of the server being connected to.
	 */
	remotePublicSecurity?: ArrayBuffer;
}
