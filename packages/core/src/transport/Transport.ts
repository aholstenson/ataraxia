import { Subscribable } from 'atvik';

import { Peer } from './Peer';

import { TransportOptions } from './TransportOptions';

/**
 * Transport that can be used to connect peers together.
 */
export interface Transport {
	/**
	 * Start this transport.
	 */
	start(options: TransportOptions): Promise<boolean>;

	/**
	 * Stop this transport.
	 */
	stop(): Promise<boolean>;

	/**
	 * Event for when this transport connects to a peer.
	 */
	readonly onPeerConnect: Subscribable<this, [ Peer ]>;

	/**
	 * Event for when this transport disconnects from a peer.
	 */
	readonly onPeerDisconnect: Subscribable<this, [ Peer ]>;
}
