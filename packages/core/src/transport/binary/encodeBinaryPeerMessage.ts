import { Encoder } from '@stablelib/cbor';

import {
	PeerMessageType,
	PeerMessage,
	HelloMessage,
	AuthMessage,
	AuthDataMessage,
	NodeSummaryMessage,
	NodeRequestMessage,
	NodeDetailsMessage,
	DataMessage,
	DataAckMessage,
	DataRejectMessage
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
	TAG_BEGIN,
	TAG_BYE
} from './tags';

/**
 * Encode a peer message into a binary format.
 *
 * @param type -
 *   type of peer message
 * @param data -
 *   data of message
 * @returns
 *  buffer with encoded message
 */
export function encodeBinaryPeerMessage<T extends PeerMessageType>(
	type: T,
	data: PeerMessage<T>
): ArrayBuffer {
	const encoder = new Encoder();
	switch(type) {
		case PeerMessageType.Ping:
			encoder.encodeInteger(TAG_PING);
			break;
		case PeerMessageType.Pong:
			encoder.encodeInteger(TAG_PONG);
			break;
		case PeerMessageType.Ok:
			encoder.encodeInteger(TAG_OK);
			break;
		case PeerMessageType.Reject:
			encoder.encodeInteger(TAG_REJECT);
			break;
		case PeerMessageType.Hello:
		{
			const helloMessage = data as HelloMessage;
			encoder.encodeInteger(TAG_HELLO);
			encoder.encodeBytes(new Uint8Array(helloMessage.id));
			encoder.encodeInteger(helloMessage.capabilities.size);
			for(const cap of helloMessage.capabilities) {
				encoder.encodeString(cap);
			}
			break;
		}
		case PeerMessageType.Select:
		{
			const selectMessage = data as HelloMessage;
			encoder.encodeInteger(TAG_SELECT);
			encoder.encodeBytes(new Uint8Array(selectMessage.id));
			encoder.encodeInteger(selectMessage.capabilities.size);
			for(const cap of selectMessage.capabilities) {
				encoder.encodeString(cap);
			}
			break;
		}
		case PeerMessageType.Auth:
		{
			const authMessage = data as AuthMessage;
			encoder.encodeInteger(TAG_AUTH);
			encoder.encodeString(authMessage.method);
			encoder.encodeBytes(new Uint8Array(authMessage.data));
			break;
		}
		case PeerMessageType.AuthData:
		{
			const authDataMessage = data as AuthDataMessage;
			encoder.encodeInteger(TAG_AUTH_DATA);
			encoder.encodeBytes(new Uint8Array(authDataMessage.data));
			break;
		}
		case PeerMessageType.Begin:
			encoder.encodeInteger(TAG_BEGIN);
			break;
		case PeerMessageType.Bye:
			encoder.encodeInteger(TAG_BYE);
			break;
		case PeerMessageType.NodeSummary:
		{
			const nodeSummaryMessage = data as NodeSummaryMessage;
			encoder.encodeInteger(TAG_NODE_SUMMARY);
			encoder.encodeInteger(nodeSummaryMessage.ownVersion);
			encoder.encodeInteger(nodeSummaryMessage.nodes.length);
			for(const routingSummary of nodeSummaryMessage.nodes) {
				encoder.encodeBytes(new Uint8Array(routingSummary.id));
				encoder.encodeInteger(routingSummary.version);
			}
			break;
		}
		case PeerMessageType.NodeRequest:
		{
			const nodeRequestMessage = data as NodeRequestMessage;
			encoder.encodeInteger(TAG_NODE_REQUEST);
			encoder.encodeInteger(nodeRequestMessage.nodes.length);
			for(const node of nodeRequestMessage.nodes) {
				encoder.encodeBytes(new Uint8Array(node));
			}
			break;
		}
		case PeerMessageType.NodeDetails:
		{
			const nodeDetailsMessage = data as NodeDetailsMessage;
			encoder.encodeInteger(TAG_NODE_DETAILS);
			encoder.encodeInteger(nodeDetailsMessage.nodes.length);
			for(const node of nodeDetailsMessage.nodes) {
				encoder.encodeBytes(new Uint8Array(node.id));
				encoder.encodeInteger(node.version);
				encoder.encodeInteger(node.neighbors.length);
				for(const neighbor of node.neighbors) {
					encoder.encodeBytes(new Uint8Array(neighbor.id));
					encoder.encodeInteger(neighbor.latency);
				}
			}
			break;
		}
		case PeerMessageType.Data:
		{
			const dataMessage = data as DataMessage;
			encoder.encodeInteger(TAG_DATA);
			encoder.encodeBytes(new Uint8Array(dataMessage.target));
			encoder.encodeString(dataMessage.type);
			encoder.encodeBytes(new Uint8Array(dataMessage.data));
			encoder.encodeInteger(dataMessage.path.length);
			for(const entry of dataMessage.path) {
				encoder.encodeBytes(new Uint8Array(entry.node));
				encoder.encodeInteger(entry.id);
			}
			break;
		}
		case PeerMessageType.DataAck:
		{
			const dataAckMessage = data as DataAckMessage;
			encoder.encodeInteger(TAG_DATA_ACK);
			encoder.encodeInteger(dataAckMessage.id);
			break;
		}
		case PeerMessageType.DataReject:
		{
			const dataRejectMessage = data as DataRejectMessage;
			encoder.encodeInteger(TAG_DATA_REJECT);
			encoder.encodeInteger(dataRejectMessage.id);
			break;
		}
		default:
			throw new Error('Unknown peer message of type: ' + (PeerMessageType[type] || type));
	}

	return encoder.finish().buffer;
}
