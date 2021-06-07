import { Decoder } from '@stablelib/cbor';

import {
	PeerMessageType,
} from '../messages';

import {
	TAG_PING,
	TAG_PONG,
	TAG_OK,
	TAG_REJECT,
	TAG_HELLO,
	TAG_SELECT,
	TAG_AUTH,
	TAG_AUTH_DATA,
	TAG_NODE_SUMMARY,
	TAG_NODE_REQUEST,
	TAG_NODE_DETAILS,
	TAG_DATA,
	TAG_DATA_ACK,
	TAG_DATA_REJECT,
	TAG_BYE,
	TAG_BEGIN
} from './tags';

/**
 * Decode a peer message from the given buffer.
 *
 * @param data -
 *   buffer containing a previously encoded peer message
 * @returns
 *   array with type of peer message followed by the data of the message
 */
export function decodeBinaryPeerMessage(data: ArrayBuffer): [ PeerMessageType, any ] | null {
	const decoder = new Decoder(new Uint8Array(data), {
		ignoreExtraData: true
	});
	const tag = decodeInteger(decoder);
	switch(tag) {
		case TAG_PING:
			return [ PeerMessageType.Ping, undefined ];
		case TAG_PONG:
			return [ PeerMessageType.Pong, undefined ];
		case TAG_OK:
			return [ PeerMessageType.Ok, undefined ];
		case TAG_REJECT:
			return [ PeerMessageType.Reject, undefined ];
		case TAG_HELLO:
			return [ PeerMessageType.Hello, {
				id: decodeId(decoder),
				capabilities: new Set(decodeArray(decoder, (): string => decodeString(decoder)))
			} ];
		case TAG_SELECT:
			return [ PeerMessageType.Select, {
				id: decodeId(decoder),
				capabilities: new Set(decodeArray(decoder, (): string => decodeString(decoder)))
			} ];
		case TAG_AUTH:
			return [ PeerMessageType.Auth, {
				method: decodeString(decoder),
				data: decodeBuffer(decoder)
			} ];
		case TAG_AUTH_DATA:
			return [ PeerMessageType.AuthData, {
				data: decodeBuffer(decoder)
			} ];
		case TAG_BEGIN:
			return [ PeerMessageType.Begin, undefined ];
		case TAG_BYE:
			return [ PeerMessageType.Bye, undefined ];
		case TAG_NODE_SUMMARY:
			return [ PeerMessageType.NodeSummary, {
				ownVersion: decodeInteger(decoder),
				nodes: decodeArray(decoder, () => ({
					id: decodeId(decoder),
					version: decodeInteger(decoder)
				}))
			} ];
		case TAG_NODE_REQUEST:
			return [ PeerMessageType.NodeRequest, {
				nodes: decodeArray(decoder, decodeId)
			} ];
		case TAG_NODE_DETAILS:
			return [ PeerMessageType.NodeDetails, {
				nodes: decodeArray(decoder, () => ({
					id: decodeId(decoder),
					version: decodeInteger(decoder),
					neighbors: decodeArray(decoder, () => ({
						id: decodeId(decoder),
						latency: decodeInteger(decoder)
					}))
				}))
			} ];
		case TAG_DATA:
			return [ PeerMessageType.Data, {
				target: decodeId(decoder),
				type: decodeString(decoder),
				data: decodeBuffer(decoder),
				path: decodeArray(decoder, () => ({
					node: decodeId(decoder),
					id: decodeInteger(decoder)
				}))
			} ];
		case TAG_DATA_ACK:
			return [ PeerMessageType.DataAck, {
				id: decodeInteger(decoder)
			} ];
		case TAG_DATA_REJECT:
			return [ PeerMessageType.DataReject, {
				id: decodeInteger(decoder)
			} ];
		default:
			return null;
	}
}

/**
 * Decode an identifier.
 *
 * @param decoder -
 * @returns
 *   identifier
 */
function decodeId(decoder: Decoder): ArrayBuffer {
	const decoded = decoder.decode() as Uint8Array;
	return decoded.buffer;
}

/**
 * Decode an array.
 *
 * @param decoder -
 * @param readItem -
 *   callback used to read items
 * @returns
 *   array with items
 */
function decodeArray<T>(decoder: Decoder, readItem: (decoder: Decoder) => T): T[] {
	const items = decoder.decode();
	const result = [];
	for(let i = 0; i < items; i++) {
		result.push(readItem(decoder));
	}
	return result;
}

/**
 * Decode an integer.
 *
 * @param decoder -
 * @returns
 *   integer value
 */
function decodeInteger(decoder: Decoder): any {
	return decoder.decode();
}

/**
 * Decode a buffer.
 *
 * @param decoder -
 * @returns
 *   buffer
 */
function decodeBuffer(decoder: Decoder): any {
	return decoder.decode().buffer;
}

/**
 * Decode a string.
 *
 * @param decoder -
 * @returns
 *   string
 */
function decodeString(decoder: Decoder): any {
	return decoder.decode();
}
