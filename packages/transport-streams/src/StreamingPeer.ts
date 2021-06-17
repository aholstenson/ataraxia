import { Duplex } from 'stream';

import {
	AbstractPeer,
	DisconnectReason,
	PeerMessage,
	PeerMessageType
} from 'ataraxia-transport';

import { encodePeerPacket, PeerPacketDecodingStream } from './binaryStreams';

/**
 * Peer that connects via a binary streaming protocol.
 */
export class StreamingPeer extends AbstractPeer {
	protected stream?: Duplex;
	protected disconnected: boolean = false;

	/**
	 * Get if a stream is available.
	 *
	 * @returns
	 *   if a stream is currently set for this peer
	 */
	public hasStream() {
		return this.stream !== undefined;
	}

	/**
	 * Set the stream being used for this peer.
	 *
	 * @param stream -
	 *   duplex stream to use
	 * @param client -
	 *   if this peer is a client
	 */
	protected setStream(stream: Duplex, client: boolean) {
		if(this.stream) {
			// Request that the previous socket is destroyed
			this.stream.destroy();
		}

		this.stream = stream;

		// Reset version
		this.version = 0;

		// Setup error and disconnected events
		stream.on('error', err => {
			if(stream === this.stream) {
				// Only trigger disconnect if this socket is active
				this.requestDisconnect(DisconnectReason.Error, err);
			}
		});

		stream.on('close', () => {
			if(stream === this.stream) {
				// Register that the socket has closed, assuming a generic error
				this.handleDisconnect(DisconnectReason.Error);
			}
		});

		// Setup the decoder for incoming messages
		const decoder = new PeerPacketDecodingStream();
		const pipe = stream.pipe(decoder);

		decoder.on('data', (data: any) => {
			const type = data[0];
			const payload = data[1];

			this.receiveData(type, payload);
		});

		// Catch errors on pipe and decoder
		decoder.on('error', err => this.debug('Error from decoder', err));
		pipe.on('error', err => this.debug('Error from pipe', err));

		if(client) {
			this.negotiateAsClient();
		} else {
			this.negotiateAsServer();
		}
	}

	/**
	 * Handle disconnect event. In addition to the inherited behavior this will
	 * destroy the socket.
	 *
	 * @param reason -
	 *   the reason for this disconnect
	 * @param err -
	 *   optional error disconnect
	 */
	protected handleDisconnect(reason: DisconnectReason, err?: Error) {
		this.stream = undefined;

		super.handleDisconnect(reason, err);
	}

	protected requestDisconnect(reason: DisconnectReason, err?: Error) {
		if(! this.stream) {
			return;
		}

		if(reason === DisconnectReason.Error || reason === DisconnectReason.PingTimeout) {
			const socket = this.stream;

			// Handle the disconnect
			this.handleDisconnect(reason, err);

			// If a raw error has ocurred destroy the socket
			socket.destroy();
		} else {
			// For other reasons request that the socket closes
			this.stream.end(() => {
				this.handleDisconnect(reason, err);
			});
		}
	}

	/**
	 * Manually disconnect this peer.
	 */
	public disconnect() {
		super.disconnect();

		this.disconnected = true;

		if(this.stream) {
			this.write(PeerMessageType.Bye)
				.then(() => this.requestDisconnect(DisconnectReason.Manual))
				.catch(() => { /* do nothing */ });
		}
	}

	/**
	 * Send a message over this peer.
	 *
	 * @param type -
	 *   type of message to send
	 * @param message -
	 *   data of message
	 * @returns
	 *   promise that resolves when the message has been written
	 */
	public send<T extends PeerMessageType>(type: T, message: PeerMessage<T>): Promise<void> {
		return this.write(type, message);
	}

	/**
	 * Write data to the peer via the current socket.
	 *
	 * @param type -
	 *   type of message
	 * @param payload -
	 *   payload being sent
	 * @returns
	 *   promise that resolves when the write completes
	 */
	private write(type: PeerMessageType, payload?: any): Promise<void> {
		if(! this.stream) {
			this.debug('No socket but tried to send', type, 'with data', payload);
			return Promise.reject(new Error('Could not send data, connection lost'));
		}

		this.debug('Sending', PeerMessageType[type], 'with data', payload);
		const data = encodePeerPacket(type, payload);
		const socket = this.stream;

		return new Promise(resolve => {
			if(socket.write(data)) {
				resolve();
			} else {
				socket.once('drain', resolve);
			}
		});
	}
}
