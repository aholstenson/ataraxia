import { Event } from 'atvik';
import debug from 'debug';

import {
	Peer,
	PeerMessageType,
	DataMessage,
	DataAckMessage,
	DataRejectMessage,
	DataMessagePathEntry,
	encodeId,
	sameId
} from 'ataraxia-transport';

import { Routing } from './Routing';

const MAX_DELAY = 5000;

interface SentMessage {
	previous?: {
		peer: ArrayBuffer;
		id: number;
	};

	resolve?: () => void;
	reject?: (err: Error) => void;

	timeout: any;
}

/**
 * Messaging on top of the current topology.
 */
export class Messaging {
	private readonly debug: debug.Debugger;

	private readonly pending: Map<number, SentMessage>;
	private readonly routing: Routing;
	private readonly dataEvent: Event<any, [ node: ArrayBuffer, type: string, payload: ArrayBuffer ]>;

	private idCounter: number;

	public constructor(
		debugNamespace: string,
		routing: Routing,
		dataEvent: Event<any, [ ArrayBuffer, string, ArrayBuffer ]>
	) {
		this.debug = debug(debugNamespace + ':messaging');

		this.pending = new Map();
		this.routing = routing;
		this.dataEvent = dataEvent;

		this.idCounter = 0;
	}

	private nextId() {
		return this.idCounter++;
	}

	private releaseId(id: number) {
		const pending = this.pending.get(id);
		if(! pending) return;

		clearTimeout(pending.timeout);
		this.pending.delete(id);
	}

	private queueTimeout(id: number): any {
		return setTimeout(() => {
			const message = this.pending.get(id);
			if(! message) return;

			this.releaseId(id);
			this.debug('TIME OUT for', id);

			if(message.reject) {
				message.reject(new Error('Timed out'));
			}
		}, MAX_DELAY);
	}

	/**
	 * Send a message to a specific node.
	 *
	 * @param target -
	 *   identifier of node
	 * @param type -
	 *   type of message
	 * @param data -
	 *   encoded data of message
	 * @returns
	 *   promise that resolves when the node has acknowledged the data, or
	 *   rejects if unable to reach the node
	 */
	public send(target: ArrayBuffer, type: string, data: ArrayBuffer): Promise<void> {
		const peer = this.routing.findPeerForTarget(target);
		if(! peer) return Promise.reject(new Error('Node not reachable'));

		const messageId = this.nextId();

		const message: DataMessage = {
			path: [
				{
					node: this.routing.self.id,
					id: messageId
				}
			],

			type: type,

			target: target,

			data: data
		};

		if(this.debug.enabled) {
			this.debug('Sending message', messageId, 'to', encodeId(target));
		}

		return new Promise<void>((resolve, reject) => {
			// Keep a record about the message being sent
			this.pending.set(messageId, {
				resolve: resolve,
				reject: reject,
				timeout: this.queueTimeout(messageId)
			});

			// Send the message to the peer
			peer.send(PeerMessageType.Data, message)
				.catch(ex => {
					this.releaseId(messageId);
					this.debug('Unable to send message', messageId, 'to', ex);
				});
		});
	}

	/**
	 * Handle incoming data from a peer.
	 *
	 * @param peer -
	 *   peer sending the data
	 * @param data -
	 *   the data sent
	 */
	public handleData(peer: Peer, data: DataMessage) {
		if(sameId(data.target, this.routing.self.id)) {
			// This is the target
			const lastPathEntry = data.path[data.path.length - 1];

			if(this.debug.enabled) {
				this.debug('Received message, sending ACK', lastPathEntry.id, 'to', encodeId(peer.id));
			}

			peer.send(PeerMessageType.DataAck, { id: lastPathEntry.id })
				.catch(err => this.debug('Caught error while sending DataAck to peer', err));

			this.routing.refresh();
			this.dataEvent.emit(data.path[0].node, data.type, data.data);
		} else {
			// Need to forward the message
			const lastPathEntry = data.path[data.path.length - 1];

			const targetPeer = this.routing.findPeerForTarget(data.target);
			if(! targetPeer || containsNode(data.path, targetPeer.id)) {
				/*
				 * We don't know how to forward this to peer or forwarding
				 * would cause a loop.
				 */
				if(this.debug.enabled) {
					this.debug('Unable to forward message, sending REJECT', lastPathEntry.id, 'to', encodeId(peer.id));
				}

				peer.send(PeerMessageType.DataReject, { id: lastPathEntry.id })
					.catch(err => this.debug('Caught error while sending DataReject to peer', err));

				return;
			}

			const messageId = this.nextId();
			const message: DataMessage = {
				path: [
					... data.path,
					{
						node: this.routing.self.id,
						id: messageId
					}
				],

				target: data.target,

				type: data.type,
				data: data.data
			};

			// Store it for automatic time out
			this.pending.set(messageId, {
				previous: {
					peer: peer.id,
					id: lastPathEntry.id
				},
				timeout: this.queueTimeout(messageId)
			});

			if(this.debug.enabled) {
				this.debug('Forwarding message, sending ACK', lastPathEntry.id, 'via', messageId, 'to', encodeId(peer.id));
			}

			// Forward the message to the target peer
			targetPeer.send(PeerMessageType.Data, message)
				.catch(err => {
					this.releaseId(messageId);
					this.debug('Caught error while forwarding DATA to peer', err);
				});
		}
	}

	/**
	 * Handle ACK received for a message.
	 *
	 * @param ack -
	 *   details about message that has been acknowledged
	 */
	public handleAck(ack: DataAckMessage) {
		const message = this.pending.get(ack.id);
		if(! message) {
			this.debug('Received unknown ACK', ack.id);
			return;
		}

		// Release the message and its identifier
		this.releaseId(ack.id);

		if(message.resolve) {
			// Resolve the pending message
			this.debug('Received ACK for', ack.id);
			message.resolve();
		} else if(message.previous) {
			// This is a routed message, resolve the peer and forward the ack
			const previous = message.previous;

			const peer = this.routing.getPeer(previous.peer);
			if(! peer) {
				if(this.debug.enabled) {
					this.debug('Unable to forward ACK', ack.id, 'to', encodeId(previous.peer));
				}

				return;
			}

			if(this.debug.enabled) {
				this.debug('Forwarding ACK', ack.id, 'to', encodeId(peer.id));
			}

			peer.send(PeerMessageType.DataAck, { id: previous.id })
				.catch(err => this.debug('Caught error while sending DataAck to peer', err));
		}
	}

	/**
	 * Handle REJECT received for a message.
	 *
	 * @param reject -
	 *   details about message that has been rejected
	 */
	public handleReject(reject: DataRejectMessage) {
		const message = this.pending.get(reject.id);
		if(! message) {
			this.debug('Received unknown REJECT', reject.id);
			return;
		}

		// Release the message and its identifier
		this.releaseId(reject.id);

		if(message.reject) {
			// Reject the pending promise
			this.debug('Received REJECT for', reject.id);
			message.reject(new Error('Could not forward message'));
		} else if(message.previous) {
			// This is a routed message, resolve the peer and forward the reject
			const previous = message.previous;

			const peer = this.routing.getPeer(previous.peer);
			if(! peer) {
				if(this.debug.enabled) {
					this.debug('Unable to forward REJECT', reject.id, 'to', encodeId(previous.peer));
				}

				return;
			}

			if(this.debug.enabled) {
				this.debug('Forwarding REJECT', reject.id, 'to', encodeId(peer.id));
			}

			peer.send(PeerMessageType.DataReject, { id: previous.id })
				.catch(err => this.debug('Caught error while sending DataReject to peer', err));
		}
	}
}

/**
 * Helper for finding if a node is present in a path.
 *
 * @param path -
 *   path to check
 * @param id -
 *   node to look for
 * @returns
 *   `true` if the path contains the node
 */
function containsNode(path: DataMessagePathEntry[], id: ArrayBuffer) {
	for(const p of path) {
		if(sameId(p.node, id)) return true;
	}

	return false;
}
