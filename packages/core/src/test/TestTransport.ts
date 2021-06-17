import { AbstractTransport, Peer } from 'ataraxia-transport';

/**
 * Transport suitable for use with tests, only support manual adding of peers.
 * Peers usable with this transport can be created via `peersBetween`.
 */
export class TestTransport extends AbstractTransport {
	public constructor() {
		super('test');
	}

	public addPeer(peer: Peer) {
		super.addPeer(peer);
	}
}
