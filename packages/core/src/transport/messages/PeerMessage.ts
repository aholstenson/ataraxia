import { PeerMessageType } from './PeerMessageType';

import { HelloMessage } from './HelloMessage';
import { SelectMessage } from './SelectMessage';

import { AuthMessage } from './AuthMessage';
import { AuthDataMessage } from './AuthDataMessage';
import { NodeRequestMessage } from './NodeRequestMessage';
import { NodeSummaryMessage } from './NodeSummaryMessage';
import { NodeDetailsMessage } from './NodeDetailsMessage';
import { DataMessage, DataAckMessage, DataRejectMessage } from './DataMessage';

/**
 * Map between type enum and the actual message type.
 */
interface MessageTypes {
	[PeerMessageType.Ping]: undefined;
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
