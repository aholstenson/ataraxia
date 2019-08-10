import { AbstractPeer } from '../src/transport/abstract-peer';
import { PeerMessageType, PeerMessage } from '../src/transport/messages';
import { Peer } from '../src/transport/peer';

export interface TestPeer extends Peer {
	connect(): void;
}

/**
 * Peer that simply sends and receives message from another instance. Used to
 * build test setups.
 */
class MirroredPeer extends AbstractPeer implements TestPeer {
	public other?: MirroredPeer;
	private disconnected: boolean;

	constructor() {
		super({
			debugNamespace: 'test',
		} as any);

		this.disconnected = false;
	}

	public requestDisconnect() {
		super.disconnect();
	}

	public connect() {
		this.disconnected = false;
		super.forceConnect(this.id);
	}

	public disconnect() {
		if(this.disconnected) return;

		this.disconnected = true;

		this.handleDisconnect();
	}

	public receiveData(type: PeerMessageType, payload: any) {
		super.receiveData(type, payload);
	}

	public forceConnect(id: ArrayBuffer) {
		super.forceConnect(id);
	}

	public send<T extends PeerMessageType>(type: T, payload: PeerMessage<T>): Promise<void> {
		if(this.disconnected) {
			return Promise.reject(new Error('Currently disconnected'));
		}

		return new Promise((resolve, reject) => {
			if(! this.other) {
				reject(new Error('Mirror of peer is not set'));
				return;
			}

			try {
				this.other.receiveData(type, payload);
				resolve();
			} catch(err) {
				reject(err);
			}
		});
	}
}

/**
 * Create a pair of peers that are mirrors of each other, the first peer sends
 * to the second pair and vice-versa.
 *
 * @returns
 *   array where the first entry represent a connection from the first peer
 *   to the second peer and the second entry represent a connection from the
 *   second peer to the first peer
 */
export function peersBetween(first: ArrayBuffer, second: ArrayBuffer): [ TestPeer, TestPeer ] {
	const a: MirroredPeer = new MirroredPeer();
	const b: MirroredPeer = new MirroredPeer();
	a.other = b;
	b.other = a;

	a.forceConnect(second);
	b.forceConnect(first);

	return [ a, b ];
}
