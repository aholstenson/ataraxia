import { AuthDataMessage } from './AuthDataMessage';
import { AuthMessage } from './AuthMessage';
import { DataMessage, DataAckMessage, DataRejectMessage } from './DataMessage';
import { HelloMessage } from './HelloMessage';
import { NodeDetailsMessage } from './NodeDetailsMessage';
import { NodeRequestMessage } from './NodeRequestMessage';
import { NodeSummaryMessage } from './NodeSummaryMessage';
import { PeerMessageType } from './PeerMessageType';
import { SelectMessage } from './SelectMessage';

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
