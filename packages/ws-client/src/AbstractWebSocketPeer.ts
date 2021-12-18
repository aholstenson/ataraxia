import {
	AuthProvider,
	AbstractPeer,
	PeerMessageType,
	PeerMessage,
	encodeBinaryPeerMessage,
	decodeBinaryPeerMessage,
	DisconnectReason,
	TransportOptions
} from 'ataraxia-transport';

import { WebSocket } from './WebSocket.js';

/**
 * Abstract implementation of a peer suitable for use with a WebSocket
 * instance.
 */
export abstract class AbstractWebSocketPeer extends AbstractPeer {
	private socket?: WebSocket;

	public constructor(
		transportOptions: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>
	) {
		super(transportOptions, authProviders);
	}

	public setSocket(socket: WebSocket) {
		this.socket = socket;

		socket.binaryType = 'arraybuffer';

		socket.addEventListener('message', event => {
			if(! (event.data instanceof ArrayBuffer)) {
				// We only work with ArrayBuffer
				return;
			}

			const decoded = decodeBinaryPeerMessage(event.data);
			if(decoded) {
				this.receiveData(decoded[0], decoded[1]);
			}
		});

		socket.addEventListener('error', () => {
			if(socket === this.socket) {
				this.handleDisconnect(DisconnectReason.Error, new Error('Disconnecting due to error'));
			}
		});

		socket.addEventListener('close', () => {
			if(this.socket) {
				// Unknown disconnect reason
				this.handleDisconnect(DisconnectReason.Error);
			}
		});
	}

	protected requestDisconnect(reason: DisconnectReason, err?: Error) {
		if(! this.socket) {
			return;
		}

		const socket = this.socket;
		this.handleDisconnect(reason, err);
		socket.close();
	}

	public disconnect() {
		super.disconnect();

		if(! this.socket) {
			return;
		}

		const socket = this.socket;
		this.handleDisconnect(DisconnectReason.Manual);
		socket.close();
	}

	protected handleDisconnect(reason: DisconnectReason, err?: Error) {
		this.socket = undefined;

		super.handleDisconnect(reason, err);
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
