import { inspect } from 'util';

import { Encoder, Decoder } from '@stablelib/cbor';
import { Event } from 'atvik';
import { debug } from 'debug';

import { encodeId } from 'ataraxia-transport';

import { Message } from './Message';
import { Node } from './Node';
import { Topology } from './topology';

/**
 * Node in the network. Thin wrapper around a topology node to provide a
 * simple consistent API suitable for public use.
 */
export class NetworkNode implements Node {
	protected readonly debug: debug.Debugger;

	private readonly topology: Topology;
	private readonly networkId: ArrayBuffer;

	public readonly id: string;

	private readonly unavailableEvent: Event<this>;
	private readonly messageEvent: Event<this, [ Message ]>;

	public constructor(
		debugNamespace: string,
		topology: Topology,
		id: ArrayBuffer
	) {
		this.topology = topology;
		this.networkId = id;
		this.id = encodeId(id);
		this.debug = debug(debugNamespace + ':node:' + this.id);

		this.unavailableEvent = new Event(this);
		this.messageEvent = new Event(this);
	}

	public get onUnavailable() {
		return this.unavailableEvent.subscribable;
	}

	public get onMessage() {
		return this.messageEvent.subscribable;
	}

	public get estimatedLatency() {
		return this.topology.get(this.networkId)?.searchCost ?? Number.MAX_SAFE_INTEGER;
	}

	public send(type: string, payload: any) {
		const encoder = new Encoder();
		encoder.encode(payload);
		const data = encoder.finish();

		this.debug('Sending message type=', type, 'data=', payload);
		return this.topology.sendData(this.networkId, type, data.buffer);
	}

	public emitMessage(type: string, data: ArrayBuffer): Message {
		const decoder = new Decoder(new Uint8Array(data));
		const payload = decoder.decode();
		const message = {
			source: this,
			type: type,
			data: payload
		};
		this.debug('Received message type=', type, 'data=', payload);
		this.messageEvent.emit(message);
		return message;
	}

	public emitUnavailable() {
		this.unavailableEvent.emit();
	}

	public [inspect.custom]() {
		return 'Node{' + this.id + '}';
	}
}
