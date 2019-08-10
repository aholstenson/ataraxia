import debug from 'debug';
import { Event } from 'atvik';

import { sameId, encodeId } from '../id';
import {
	Peer,
	PeerMessageType,
	DataMessage,
	DataAckMessage,
	DataRejectMessage,
	DataMessagePathEntry
} from '../transport';

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
	private readonly dataEvent: Event<any, [ ArrayBuffer, string, ArrayBuffer ]>;

	private idCounter: number;

	constructor(
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
		return setTimeout(() => this.releaseId(id), MAX_DELAY);
	}

	public async send(target: ArrayBuffer, type: string, data: ArrayBuffer): Promise<void> {
		const peer = this.routing.findPeerForTarget(target);
		if(! peer) throw new Error('Node not reachable');

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

		try {
			await peer.send(PeerMessageType.Data, message);
		} catch(ex) {
			this.releaseId(messageId);
			this.debug('Unable to send message to peer', ex);
			throw ex;
		}

		return new Promise((resolve, reject) => {
			this.pending.set(messageId, {
				resolve: resolve,
				reject: reject,
				timeout: this.queueTimeout(messageId)
			});
		});
	}

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
				this.debug('Forwarding message, sending ACK', lastPathEntry.id, 'to', encodeId(peer.id));
			}

			// Forward the message to the target peer
			targetPeer.send(PeerMessageType.Data, message)
				.catch(err => this.debug('Caught error while sending DataReject to peer', err));
		}
	}

	public handleAck(ack: DataAckMessage) {
		const message = this.pending.get(ack.id);
		if(! message) return;

		// Release the message and its identifier
		this.releaseId(ack.id);

		if(message.resolve) {
			// Resolve the pending message
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

	public handleReject(reject: DataRejectMessage) {
		const message = this.pending.get(reject.id);
		if(! message) return;

		// Release the message and its identifier
		this.releaseId(reject.id);

		if(message.reject) {
			// Reject the pending promise
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

function containsNode(path: DataMessagePathEntry[], id: ArrayBuffer) {
	for(const p of path) {
		if(sameId(p.node, id)) return true;
	}

	return false;
}
