import {
	AbstractPeer,
	DisconnectReason,
	Peer,
	PeerMessage,
	PeerMessageType
} from 'ataraxia-transport';

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

	public constructor() {
		super({
			debugNamespace: 'test',
		} as any, []);

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

		this.handleDisconnect(DisconnectReason.Manual);
	}

	public receiveData(type: PeerMessageType, payload: any) {
		super.receiveData(type, payload);
	}

	public forceConnect(id: ArrayBuffer) {
		super.forceConnect(id);
	}

	public send<T extends PeerMessageType>(type: T, payload: PeerMessage<T>): Promise<void> {
		if(! this.connected) {
			return Promise.reject(new Error('Currently disconnected'));
		}

		return new Promise((resolve, reject) => {
			setImmediate(() => {
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
		});
	}
}

/**
 * Create a pair of peers that are mirrors of each other, the first peer sends
 * to the second pair and vice-versa.
 *
 * @param first -
 *   id of first peer
 * @param second -
 *   if of second peer
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

	a.id = second;
	b.id = first;

	return [ a, b ];
}
