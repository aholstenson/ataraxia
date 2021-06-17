import { Transform, TransformCallback } from 'stream';

import {
	decodeBinaryPeerMessage,
	encodeBinaryPeerMessage,
	PeerMessage,
	PeerMessageType
} from 'ataraxia-transport';

const ADDITIONAL_INFO_8_BITS = 24;
const ADDITIONAL_INFO_16_BITS = 25;
const ADDITIONAL_INFO_32_BITS = 26;

const MAX_UINT8 = 255;
const MAX_UINT16 = Math.pow(2, 16) - 1;
const MAX_UINT32 = Math.pow(2, 32) - 1;

/**
 * Stream that will decode packets as they are received. Packets use a header
 * consisting of a packet length encoded as a CBOR number.
 */
export class PeerPacketDecodingStream extends Transform {
	private buffer: Buffer = Buffer.alloc(0);

	public constructor() {
		super({
			objectMode: true
		});
	}

	public _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
		if(! chunk) return this.end();

		this.buffer = Buffer.concat([ this.buffer, chunk ]);

		let offset = 0;
		while(this.buffer.length >= offset + 1) {
			const firstByte = this.buffer[offset];
			const additionalInfo = firstByte & 31;

			// Decode the CBOR encoded length
			const remaining = this.buffer.length - offset - 1;
			let length: number;
			let headerBytes: number;
			if(additionalInfo < ADDITIONAL_INFO_8_BITS) {
				length = additionalInfo;
				headerBytes = 1;
			} else if(additionalInfo === ADDITIONAL_INFO_8_BITS) {
				if(remaining < 1) break;

				length = this.buffer[offset + 1];
				headerBytes = 2;
			} else if(additionalInfo === ADDITIONAL_INFO_16_BITS) {
				if(remaining < 2) break;

				length = this.buffer.readUInt16BE(offset + 1);
				headerBytes = 3;
			} else if(additionalInfo === ADDITIONAL_INFO_32_BITS) {
				if(remaining < 4) break;

				length = this.buffer.readUInt32BE(offset + 1);
				headerBytes = 5;
			} else {
				throw new Error('Unknown size, additionalInfo=' + additionalInfo);
			}

			// Check that we have enough bytes, if not wait for more bytes
			if(this.buffer.length - offset < length + headerBytes) break;

			const start = offset + headerBytes;
			const data = this.buffer.slice(start, start + length);
			this.push(decodeBinaryPeerMessage(data));

			offset = start + length;
		}

		/*
		 * Slice the buffer so that the bytes that have been consumed are not
		 * consumed again.
		 */
		if(offset > 0) {
			this.buffer = this.buffer.slice(offset);
		}

		callback();
	}
}

/**
 * Encode a full packet for a given message and data.
 *
 * @param type -
 *   type of message
 * @param data -
 *   data of message
 * @returns
 *   buffer with packet
 */
export function encodePeerPacket<T extends PeerMessageType>(
	type: T,
	data: PeerMessage<T>
): Buffer {
	const encoded = encodeBinaryPeerMessage(type, data);

	// Encode the length as a CBOR value
	const length = encoded.byteLength;
	let header: Buffer;
	if(length < ADDITIONAL_INFO_8_BITS) {
		header = Buffer.alloc(1);
		header[0] = length;
	} else if(length <= MAX_UINT8) {
		header = Buffer.alloc(2);
		header[0] = ADDITIONAL_INFO_8_BITS;
		header[1] = length;
	} else if(length <= MAX_UINT16) {
		header = Buffer.alloc(3);
		header[0] = ADDITIONAL_INFO_16_BITS;
		header.writeUInt16BE(length, 1);
	} else if(length <= MAX_UINT32) {
		header = Buffer.alloc(5);
		header[0] = ADDITIONAL_INFO_32_BITS;
		header.writeUInt32BE(length, 1);
	} else {
		throw new Error('Packet is too large, size is ' + length);
	}

	return Buffer.concat([ header, new Uint8Array(encoded) ]);
}
