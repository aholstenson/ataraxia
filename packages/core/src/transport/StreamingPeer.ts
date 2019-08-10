import { AbstractPeer } from './AbstractPeer';
import { Socket } from 'net';
import { PeerMessageType } from './messages/PeerMessageType';
import { PeerMessage } from './messages/PeerMessage';
import { encodePeerPacket, PeerPacketDecodingStream } from './binary';

/**
 * Peer that connects via a binary streaming protocol.
 */
export class StreamingPeer extends AbstractPeer {
	private socket?: Socket;
	protected disconnected: boolean = false;

	/**
	 * Get if a socket is available.
	 */
	public hasSocket() {
		return this.socket !== undefined;
	}

	/**
	 * Set the socket being used for this peer.
	 *
	 * @param {Socket} s
	 */
	public setSocket(s: Socket) {
		if(this.socket) {
			// Request that the previous socket is destroyed
			this.socket.destroy();
		}

		this.socket = s;

		// Reset version
		this.version = 0;

		// Setup error and disconnected events
		s.on('error', err => {
			if(s === this.socket) {
				// Only trigger disconnect if this socket is active
				this.handleDisconnect(err);
			}
		});

		s.on('close', hadError => {
			if(hadError) return;

			if(s === this.socket) {
				this.handleDisconnect();
			}
		});

		// Setup the decoder for incoming messages
		const decoder = new PeerPacketDecodingStream();
		const pipe = s.pipe(decoder);

		decoder.on('data', (data: any) => {
			const type = data[0];
			const payload = data[1];

			this.receiveData(type, payload);
		});

		// Catch errors on pipe and decoder
		decoder.on('error', err => this.debug('Error from decoder', err));
		pipe.on('error', err => this.debug('Error from pipe', err));
	}

	/**
	 * Handle disconnect event. In addition to the inherited behavior this will
	 * destroy the socket.
	 */
	protected handleDisconnect(err?: Error) {
		if(this.socket) {
			this.socket.destroy();
		}

		this.socket = undefined;

		super.handleDisconnect(err);
	}

	protected requestDisconnect(err?: Error) {
		if(this.socket) {
			if(err) {
				this.socket.emit('error', err);
			} else {
				this.socket.destroy();
			}
		}
	}

	/**
	 * Manually disconnect this peer.
	 */
	public disconnect() {
		super.disconnect();

		this.disconnected = true;

		if(this.socket) {
			const socket = this.socket;
			this.write(PeerMessageType.Bye)
				.then(() => socket.destroy())
				.catch(() => { /* do nothing */ });
		}
	}

	/**
	 * Send a message over this peer.
	 *
	 * @param type
	 * @param message
	 */
	public send<T extends PeerMessageType>(type: T, message: PeerMessage<T>): Promise<void> {
		return this.write(type, message);
	}

	/**
	 * Write data to the peer via the current socket.
	 *
	 * @param {string} type
	 * @param {*} payload
	 */
	private write(type: PeerMessageType, payload?: any): Promise<void> {
		if(! this.socket) {
			this.debug('No socket but tried to send', type, 'with data', payload);
			return Promise.reject(new Error('Could not send data, connection lost'));
		}

		this.debug('Sending', PeerMessageType[type], 'with data', payload);
		const data = encodePeerPacket(type, payload);
		const socket = this.socket;

		return new Promise((resolve, reject) => socket.write(data, err => {
			if(err) {
				this.debug('Could not send data;', err);
				reject(err);
			} else {
				resolve();
			}
		}));
	}
}
