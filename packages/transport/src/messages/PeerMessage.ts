import { AuthDataMessage } from './AuthDataMessage.js';
import { AuthMessage } from './AuthMessage.js';
import { DataMessage, DataAckMessage, DataRejectMessage } from './DataMessage.js';
import { HelloMessage } from './HelloMessage.js';
import { NodeDetailsMessage } from './NodeDetailsMessage.js';
import { NodeRequestMessage } from './NodeRequestMessage.js';
import { NodeSummaryMessage } from './NodeSummaryMessage.js';
import { PeerMessageType } from './PeerMessageType.js';
import { SelectMessage } from './SelectMessage.js';

/**
 * Map between type enum and the actual message type.
 */
interface MessageTypes {
	[PeerMessageType.Ping]: undefined;
	[PeerMessageType.Pong]: undefined;
	[PeerMessageType.Ok]: undefined;
	[PeerMessageType.Reject]: undefined;

	[PeerMessageType.Hello]: HelloMessage;
	[PeerMessageType.Select]: SelectMessage;

	[PeerMessageType.Auth]: AuthMessage;
	[PeerMessageType.AuthData]: AuthDataMessage;

	[PeerMessageType.NodeSummary]: NodeSummaryMessage;
	[PeerMessageType.NodeRequest]: NodeRequestMessage;
	[PeerMessageType.NodeDetails]: NodeDetailsMessage;

	[PeerMessageType.Data]: DataMessage;
	[PeerMessageType.DataAck]: DataAckMessage;
	[PeerMessageType.DataReject]: DataRejectMessage;
}

/**
 * Type used to resolve what kind of message is associated with an enum value
 * from PeerMessageType. This allows for some extended type safety in peers.
 */
export type PeerMessage<T extends PeerMessageType> = T extends number ? MessageTypes[T] : never;
