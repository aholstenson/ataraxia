import { Subscribable } from 'atvik';

import { PeerMessage } from './messages/PeerMessage';
import { PeerMessageType } from './messages/PeerMessageType';

/**
 * Peer that represents a connection between two transport instances. Peers
 * are nodes that the network is directly connected to.
 *
 * Peers are created by a `Transport` and provide an abstraction of the location
 * of the remote peer, regardless of it lives on a remote computers, within the
 * same VM or on the same machine.
 *
 */
export interface Peer {
	/**
	 * The unique identifier of this peer.
	 */
	readonly id: ArrayBuffer;

	/**
	 * Event emitted when this peer connects.
	 */
	readonly onConnect: Subscribable<this, []>;

	/**
	 * Event emitted when this peer disconnects.
	 */
	readonly onDisconnect: Subscribable<this, []>;

	/**
	 * Event emitted when a message is received from the peer.
	 */
	readonly onData: Subscribable<this, [ type: PeerMessageType, payload: any ]>;

	/**
	 * If this peer is fully connected.
	 */
	readonly connected: boolean;

	/**
	 * Get the latency of this peer.
	 */
	readonly latency: number;

	/**
	 * Send data to this peer.
	 *
	 * @param type -
	 *   type of message being sent
	 * @param data -
	 *   data of message
	 */
	send<T extends PeerMessageType>(type: T, payload: PeerMessage<T>): Promise<void>;

	/**
	 * Request a disconnect of this peer.
	 */
	disconnect(): void;
}
