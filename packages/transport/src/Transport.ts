import { Subscribable } from 'atvik';

import { Peer } from './Peer';
import { TransportOptions } from './TransportOptions';

/**
 * Transport that can be used to connect peers together. Transports are how
 * {@link Peer}s are discovered and connected to. An implementation of this
 * interface must support being started and stopped and should report peers
 * via the {@link onPeerConnect} event.
 *
 * To simplify implementation transports are commonly implemented via
 * {@link AbstractTransport} which takes care of the event firing and stopping
 * active peers when the transport is being stopped.
 */
export interface Transport {
	/**
	 * Start this transport.
	 *
	 * @param options -
	 *   options describing some details about how to join the network, such
	 *   as the identifier of this node, the network name and if joining as
	 *   a client or not.
	 * @returns
	 *   promise returning if the transport was started or not
	 */
	start(options: TransportOptions): Promise<boolean>;

	/**
	 * Stop this transport.
	 *
	 * @returns
	 *   promise returning if the transport was stopped or not
	 */
	stop(): Promise<boolean>;

	/**
	 * Event for when this transport connects to a peer.
	 */
	readonly onPeerConnect: Subscribable<this, [ peer: Peer ]>;
}
