import { WithNetwork } from 'ataraxia';
import {
	AbstractPeer,
	PeerMessageType,
	PeerMessage,
	encodeBinaryPeerMessage,
	decodeBinaryPeerMessage
} from 'ataraxia/transport';

import { WebSocket } from './WebSocket';

/**
 * Abstract implementation of a peer suitable for use with a WebSocket
 * instance.
 */
export abstract class AbstractWebSocketPeer extends AbstractPeer {
	private socket?: WebSocket;

	constructor(parent: WithNetwork, socket?: WebSocket) {
		super(parent);
	}

	public setSocket(socket: WebSocket) {
		this.socket = socket;

		socket.binaryType = 'arraybuffer';

		socket.addEventListener('message', event => {
			const [ type, payload ] = decodeBinaryPeerMessage(event.data);
			this.receiveData(type, payload);
		});

		socket.addEventListener('close', () => {
			this.handleDisconnect();
		});
	}

	public requestDisconnect() {
		if(this.socket) {
			this.socket.close();
		}
	}

	public disconnect() {
		super.disconnect();

		if(this.socket) {
			this.socket.close();
		}
	}

	protected handleDisconnect(err?: Error) {
		this.socket = undefined;

		super.handleDisconnect(err);
	}

	public async send<T extends PeerMessageType>(type: T, payload: PeerMessage<T>): Promise<void> {
		if(! this.socket) {
			this.debug('No socket but tried to send', type, 'with data', payload);
			return;
		}

		this.debug('Sending', PeerMessageType[type], 'with data', payload);

		const data = encodeBinaryPeerMessage(type, payload);
		this.socket.send(data);
	}
}
