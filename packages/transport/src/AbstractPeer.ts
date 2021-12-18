import { FailureDetector } from 'adaptive-accrual-failure-detector';
import { Event } from 'atvik';
import { debug } from 'debug';

import {
	AuthProvider,
	AuthClientFlow,
	AuthServerFlow,
	AuthServerReplyType,
	AuthServerReply,
	AuthClientReplyType,
	AuthClientReply
} from './auth';
import { DisconnectReason } from './DisconnectReason';
import { noId, encodeId } from './ids';
import {
	PeerMessageType,
	PeerMessage,
	HelloMessage,
	SelectMessage,
	AuthMessage,
	AuthDataMessage
} from './messages';
import { Peer } from './Peer';
import { TransportOptions } from './TransportOptions';

/**
 * The interval at which pings are sent.
 */
const pingInterval = 30000;
/**
 * The interval at which pings are checked.
 */
const pingCheckInterval = 5000;
/**
 * The maximum time before a ping must have been received.
 */
const pingMaxTime = pingInterval * 3;

const enum State {
	Initial,

	WaitingForHello,
	WaitingForSelectAck,
	WaitingForAuth,
	WaitingForAuthData,
	WaitingForBegin,

	WaitingForSelect,
	WaitingForAuthAck,

	Active
}

/**
 * Abstract implementation of `Peer`. Used as the basis that negotiates
 * protocol versions and requested features.
 */
export abstract class AbstractPeer implements Peer {
	protected readonly transportOptions: TransportOptions;

	protected debug: debug.Debugger;
	private failureDetector: FailureDetector;

	public id: ArrayBuffer;
	protected version?: number;

	private state: State;

	private readonly connectEvent: Event<this>;
	private readonly disconnectEvent: Event<this>;
	private readonly dataEvent: Event<this, [ PeerMessageType, any ]>;

	private lastLatencyTime: number;
	private latencyValues: number[];

	private helloTimeout: any;
	private pingSender: any;
	private pingChecker: any;
	private lastPing: number;

	private readonly authProviders: ReadonlyArray<AuthProvider>;
	private remainingAuthProviders?: AuthProvider[];
	private authClientFlow?: AuthClientFlow;
	private authServerFlow?: AuthServerFlow;

	/**
	 * Create a new peer over the given transport.
	 *
	 * @param transportOptions -
	 *   the transport this belongs to
	 * @param authProviders -
	 *   `AuthProvider` instances to use to authenticate with the other side
	 */
	public constructor(
		transportOptions: TransportOptions,
		authProviders: ReadonlyArray<AuthProvider>
	) {
		this.transportOptions = transportOptions;
		this.debug = debug(transportOptions.debugNamespace + ':peer:pending');

		this.authProviders = authProviders;

		this.state = State.Initial;

		this.connectEvent = new Event(this);
		this.disconnectEvent = new Event(this);
		this.dataEvent = new Event(this);

		this.id = noId();
		this.failureDetector = new FailureDetector();

		this.lastLatencyTime = Date.now();
		this.latencyValues = [];

		this.lastPing = 0;
	}

	public get onConnect() {
		return this.connectEvent.subscribable;
	}

	public get onDisconnect() {
		return this.disconnectEvent.subscribable;
	}

	public get onData() {
		return this.dataEvent.subscribable;
	}

	public get connected() {
		return this.state === State.Active;
	}

	/**
	 * Get a buffer representing a publicly known security challenge for the
	 * local side of the peer.
	 *
	 * @returns
	 *   buffer with challenge or undefined
	 */
	protected localPublicSecurity(): ArrayBuffer | undefined {
		return undefined;
	}

	/**
	 * Get a buffer representing a publicly known security challenge for the
	 * remote side of the peer.
	 *
	 * @returns
	 *   buffer with challenge or undefined
	 */
	protected remotePublicSecurity(): ArrayBuffer | undefined {
		return undefined;
	}

	/**
	 * Manually disconnect this peer.
	 */
	public disconnect() {
		this.debug('Requesting disconnect from peer');
	}

	/**
	 * Request that this peer disconnects.
	 *
	 * @param reason -
	 *   the reason why this disconnect is happening
	 * @param err -
	 *   optional error recorded
	 */
	protected abstract requestDisconnect(reason: DisconnectReason, err?: Error): void;

	/**
	 * Handle disconnect event. This implementation will log info about the
	 * disconnect and then mark the peer as disconnected.
	 *
	 * Transports may override this to provide reconnection behavior.
	 *
	 * @param reason -
	 *   the reason why this disconnect happened
	 * @param err -
	 *   optional error recorded
	 */
	protected handleDisconnect(reason: DisconnectReason, err?: Error) {
		this.debug('Disconnected', 'reason=', DisconnectReason[reason], 'error=', err);

		clearTimeout(this.helloTimeout);

		clearInterval(this.pingSender);
		clearInterval(this.pingChecker);

		const wasActive = this.state === State.Active;
		this.state = State.Initial;

		if(wasActive) {
			this.disconnectEvent.emit();
		}
	}

	protected queueNegotiationTimeout() {
		// Wait a few seconds for the hello from the other side
		if(this.helloTimeout) {
			clearTimeout(this.helloTimeout);
		}
		this.helloTimeout = setTimeout(
			() => this.abort('Timeout during negotiation'),
			5000
		);
	}

	/**
	 * Abort a connection.
	 *
	 * @param message -
	 *   message for logging purposes
	 * @param error -
	 *   optional error recording
	 * @param reason -
	 *   reason for disconnect
	 */
	protected abort(message: string, error?: unknown, reason: DisconnectReason = DisconnectReason.NegotiationFailed) {
		clearTimeout(this.helloTimeout);

		this.debug(message, 'reason=', DisconnectReason[reason], 'error=', error);
		this.requestDisconnect(reason, error instanceof Error ? error : new Error(String(error)));
	}

	/**
	 * Initiate negotiation as the server. This will send the initial Hello
	 * to the client and this peer will start waiting for a reply.
	 */
	protected negotiateAsServer() {
		this.debug = debug(this.transportOptions.debugNamespace + ':peer:pending:server');

		this.state = State.WaitingForSelect;

		// Write the hello message
		const message: HelloMessage = {
			id: this.transportOptions.networkId,
			capabilities: new Set()
		};

		this.send(PeerMessageType.Hello, message)
			.catch(err => this.abort('Unable to send HELLO to client', err));

		this.queueNegotiationTimeout();
	}

	/**
	 * Initiate negotiation as the client. This will switch the peer into a
	 * client mode and wait for the initial Hello from the server.
	 */
	protected negotiateAsClient() {
		this.debug = debug(this.transportOptions.debugNamespace + ':peer:pending:client');

		this.registerLatencySend();

		this.state = State.WaitingForHello;

		this.queueNegotiationTimeout();
	}

	/**
	 * Receive a message from the peer. This will method is responsible for
	 * checking the state of the peer and routing messages to their correct
	 * locations.
	 *
	 * @param type -
	 *   type of message received
	 * @param payload -
	 *   data of message received
	 */
	protected receiveData(type: PeerMessageType, payload: any) {
		this.debug('Incoming', PeerMessageType[type], 'with payload', payload);
		switch(type) {
			case PeerMessageType.Bye:
				this.requestDisconnect(DisconnectReason.Manual);
				break;
			case PeerMessageType.Ping:
				this.receivePing();
				break;
			case PeerMessageType.Pong:
				this.receivePong();
				break;
			case PeerMessageType.Hello:
				if(this.state === State.WaitingForHello) {
					this.receiveHello(payload as HelloMessage);
				} else {
					this.abort('Received unexpected HELLO');
				}
				break;
			case PeerMessageType.Select:
				if(this.state === State.WaitingForSelect) {
					this.receiveSelect(payload as SelectMessage);
				} else {
					this.abort('Received unexpected SELECT');
				}
				break;
			case PeerMessageType.Auth:
				if(this.state === State.WaitingForAuth) {
					this.receiveAuth(payload as AuthMessage);
				} else {
					this.abort('Received unexpected AUTH');
				}
				break;
			case PeerMessageType.AuthData:
				if(this.state === State.WaitingForAuthData) {
					this.receiveClientAuthData(payload as AuthDataMessage);
				} else if(this.state === State.WaitingForAuthAck) {
					this.receiveServerAuthData(payload as AuthDataMessage);
				} else {
					this.abort('Received unexpected AUTHDATA');
				}
				break;
			case PeerMessageType.Begin:
				if(this.state === State.WaitingForBegin) {
					this.registerLatencyReply();

					this.switchToActive();
				} else {
					this.abort('Received unexpected BEGIN');
				}
				break;
			case PeerMessageType.Ok:
				if(this.state === State.WaitingForSelectAck) {
					this.receiveSelectOK();
				} else if(this.state === State.WaitingForAuthAck) {
					this.receiveAuthOk();
				} else {
					this.abort('Received unexpected OK');
				}
				break;
			case PeerMessageType.Reject:
				if(this.state === State.WaitingForSelectAck) {
					this.abort('SELECT was rejected by server');
				} else if(this.state === State.WaitingForAuthAck) {
					this.receiveAuthReject();
				} else {
					this.abort('Received unexpected REJECT');
				}
				break;
			default:
				this.dataEvent.emit(type, payload);
		}
	}

	/**
	 * Client flow: HELLO received. A HELLO with information about the server
	 * has been received. Process and send back a reply.
	 *
	 * @param message -
	 */
	private receiveHello(message: HelloMessage) {
		// Set the identifier and the version of the protocol to use
		this.id = message.id;

		// Update debugging with the identifier of the peer
		this.debug = debug(this.transportOptions.debugNamespace + ':peer:' + encodeId(this.id) + ':client');

		// TODO: Select capabilities wanted
		const capabilities = new Set<string>();

		// Switch state to waiting for the OK from the server
		this.state = State.WaitingForSelectAck;

		// Send our reply
		const reply: SelectMessage = {
			id: this.transportOptions.networkId,
			capabilities: capabilities
		};

		// Measure the latency between the sending of SELECT and OK from server
		this.registerLatencySend();

		this.send(PeerMessageType.Select, reply)
			.catch(err => this.abort('Unable to send SELECT reply', err));

		// Requeue a timeout for the negotiation
		this.queueNegotiationTimeout();
	}

	/**
	 * Server flow: SELECT received. The client as picked the capabilities it
	 * wants and is ready to proceed.
	 *
	 * @param message -
	 */
	private receiveSelect(message: SelectMessage) {
		// Update the id of this peer with the client one
		this.id = message.id;

		// Update debugging with the identifier of the peer
		this.debug = debug(this.transportOptions.debugNamespace + ':peer:' + encodeId(this.id) + ':server');

		// TODO: Handle incoming capabilities

		// Next step is to wait for the client to request authentication
		this.state = State.WaitingForAuth;

		// Simple OK reply expected by the client
		this.send(PeerMessageType.Ok, undefined)
			.catch(err => this.abort('Unable to send OK', err));

		// Requeue a timeout for the negotiation
		this.queueNegotiationTimeout();
	}

	/**
	 * Client flow: OK after SELECT. The server has received our SELECT and
	 * replied with an OK.
	 */
	private receiveSelectOK() {
		// Register the time it took for the server to ok
		this.registerLatencyReply();

		this.state = State.WaitingForAuthAck;

		// Assign the initial providers and send our initial auth
		this.remainingAuthProviders = this.authProviders.slice();
		this.sendInitialAuth();
	}

	/**
	 * Pick the next provider to use for authentication.
	 *
	 * @returns
	 *   the next provider to try or `null`
	 */
	private pickNextAuthProvider() {
		if(! this.remainingAuthProviders) {
			return null;
		}

		// eslint-disable-next-line no-constant-condition
		while(true) {
			if(this.remainingAuthProviders.length === 0) return null;

			const provider = this.remainingAuthProviders[0];
			this.remainingAuthProviders.splice(0, 1);

			if(provider.createClientFlow) {
				return provider;
			}
		}
	}

	private sendInitialAuth() {
		const provider = this.pickNextAuthProvider();

		if(provider && provider.createClientFlow) {
			const authClientFlow = provider.createClientFlow({
				localPublicSecurity: this.localPublicSecurity(),
				remotePublicSecurity: this.remotePublicSecurity()
			});

			this.authClientFlow = authClientFlow;

			// Get the initial message and send the request to the server
			(async () => {
				let msg;
				try {
					msg = await authClientFlow.initialMessage();
				} catch(err) {
					this.abort('Initial auth message failed', err);
					return;
				}

				try {
					await this.send(PeerMessageType.Auth, {
						method: provider.id,
						data: msg
					});
				} catch(err) {
					this.abort('Could not get or send initial auth message', err);
				}
			})().catch(err => this.abort('Unexpected error', err));

			// Queue a negotiation timeout
			this.queueNegotiationTimeout();
		} else {
			this.abort('Could not authenticate with any activate provider', undefined, DisconnectReason.AuthReject);
		}
	}

	/**
	 * Client flow: Server accepted our authentication.
	 */
	private receiveAuthOk() {
		this.send(PeerMessageType.Begin, undefined)
			.then(() => this.switchToActive())
			.catch(err => this.abort('Sending BEGIN failed', err));
	}

	/**
	 * Client flow: Server rejected our authentication. Try another one.
	 */
	private receiveAuthReject() {
		this.sendInitialAuth();
	}

	/**
	 * Client flow: AUTHDATA has been received from the server.
	 *
	 * @param message -
	 */
	private receiveServerAuthData(message: AuthDataMessage) {
		(async () => {
			if(! this.authClientFlow) {
				this.abort('No client flow available and server sent AUTHDATA');
				return;
			}

			let reply: AuthClientReply;
			try {
				reply = await this.authClientFlow.receiveData(message.data);
			} catch(err) {
				this.abort('Error while handling auth data', err);
				return;
			}

			if(reply.type === AuthClientReplyType.Data) {
				try {
					await this.send(PeerMessageType.AuthData, {
						data: reply.data
					});
				} catch(err) {
					this.abort('Error while sending auth reply', err);
				}
			} else if(reply.type === AuthClientReplyType.Reject) {
				// Retry the next authentication method
				this.sendInitialAuth();
			}
		})().catch(err => this.abort('Unexpected error', err));

		this.queueNegotiationTimeout();
	}

	/**
	 * Server flow: AUTH has been received from client.
	 *
	 * @param message -
	 */
	private receiveAuth(message: AuthMessage) {
		(async () => {
			if(this.authServerFlow) {
				try {
					await this.authServerFlow.destroy();
				} catch(err) {
					this.debug('Error while releasing server auth flow', err);
				}
			}

			let provider: AuthProvider | undefined;
			for(const p of this.authProviders) {
				if(p.id === message.method) {
					provider = p;
					break;
				}
			}

			if(! provider || ! provider.createServerFlow) {
				// This provider does not exist, reject the authentication attempt
				this.send(PeerMessageType.Reject, undefined)
					.catch(err => this.abort('Could not send REJECT', err));

				this.queueNegotiationTimeout();
				return;
			}

			const authServerFlow = provider.createServerFlow({
				localPublicSecurity: this.localPublicSecurity(),
				remotePublicSecurity: this.remotePublicSecurity()
			});

			this.authServerFlow = authServerFlow;

			let reply;
			try {
				reply = await authServerFlow.receiveInitial(message.data);
			} catch(err) {
				this.abort('Error while handling initial auth', err);
				return;
			}

			try {
				await this.handleSendingAuthReply(reply);
			} catch(err) {
				this.abort('Error while sending auth reply', err);
			}
		})().catch(err => this.abort('Unexpected error', err));

		this.queueNegotiationTimeout();
	}

	private handleSendingAuthReply(reply: AuthServerReply): Promise<void> {
		switch(reply.type) {
			case AuthServerReplyType.Ok:
				// Authentication passed
				this.registerLatencySend();

				this.state = State.WaitingForBegin;
				return this.send(PeerMessageType.Ok, undefined);
			case AuthServerReplyType.Reject:
				// Authentication was rejected, switch back to waiting for another auth
				this.state = State.WaitingForAuth;
				return this.send(PeerMessageType.Reject, undefined);
			case AuthServerReplyType.Data:
				// Extra data to pass back to the client
				this.state = State.WaitingForAuthData;
				if(! reply.data) {
					this.abort('Auth provider returned data reply without any data');
					return Promise.reject();
				}

				return this.send(PeerMessageType.AuthData, {
					data: reply.data
				});
		}

		throw new Error('Unknown type of reply');
	}

	/**
	 * Server flow: AUTHDATA has been received from client.
	 *
	 * @param message -
	 */
	private receiveClientAuthData(message: AuthDataMessage) {
		(async () => {
			if(! this.authServerFlow) {
				this.abort('No server flow active and client sent AUTHDATA');
				return;
			}

			let reply;
			try {
				reply = await this.authServerFlow.receiveData(message.data);
			} catch(err) {
				this.abort('Error while handling auth data', err);
				return;
			}

			try {
				await this.handleSendingAuthReply(reply);
			} catch(err) {
				this.abort('Error while sending auth reply', err);
			}
		})().catch(err => this.abort('Unexpected error', err));

		this.queueNegotiationTimeout();
	}

	private switchToActive() {
		this.debug('Switching to active');

		// Make sure the timeout won't be triggered
		clearTimeout(this.helloTimeout);
		this.helloTimeout = undefined;

		// Notify the peer that it has been connected
		this.didConnect();

		// Switch to active state
		this.state = State.Active;

		if(this.authClientFlow) {
			this.authClientFlow.destroy()
				.catch(err => this.debug('Error while releasing client auth flow', err));
		}

		if(this.authServerFlow) {
			this.authServerFlow.destroy()
				.catch(err => this.debug('Error while releasing server auth flow', err));
		}

		// Setup ping sending
		this.failureDetector.registerHeartbeat();
		this.lastPing = Date.now();

		this.pingChecker = setInterval(this.checkFailure.bind(this), pingCheckInterval);
		this.pingSender = setInterval(this.sendPing.bind(this), pingInterval);

		// Emit the connect event
		this.connectEvent.emit();
	}

	/**
	 * Callback for when a peer has connected.
	 */
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	protected didConnect(): void {
	}

	/**
	 * Force a connection without performing negotiation.
	 *
	 * @param id -
	 *   identifier of the peer
	 */
	protected forceConnect(id: ArrayBuffer) {
		this.id = id;
		this.debug = debug(this.transportOptions.debugNamespace + ':peer:' + encodeId(this.id) + ':client');

		this.latencyValues.push(0);
		this.switchToActive();
	}

	/**
	 * Send a ping to the peer.
	 */
	private sendPing() {
		this.registerLatencySend();

		this.send(PeerMessageType.Ping, undefined)
			.catch(err => this.debug('Caught error while sending ping', err));
	}

	/**
	 * Receive a ping and send a pong response.
	 */
	private receivePing() {
		this.lastPing = Date.now();
		this.failureDetector.registerHeartbeat();

		this.send(PeerMessageType.Pong, undefined)
			.catch(err => this.debug('Caught error while sending pong', err));
	}

	/**
	 * Receive a pong from a sent ping.
	 */
	private receivePong() {
		this.registerLatencyReply();
	}

	/**
	 * Check if this peer can be considered failed and request us to be
	 * disconnected from it.
	 */
	private checkFailure() {
		if(this.failureDetector.checkFailure() || this.lastPing + pingMaxTime < Date.now()) {
			this.requestDisconnect(DisconnectReason.PingTimeout, new Error('Timeout due to no ping'));
		}
	}

	/**
	 * Register that a latency request has been sent, such as a ping.
	 */
	private registerLatencySend() {
		this.lastLatencyTime = Date.now();
	}

	/**
	 * Register that a latency reply has been received, such as a pong.
	 */
	private registerLatencyReply() {
		const time = Date.now();
		if(this.latencyValues.length > 5) {
			this.latencyValues.splice(0, 1);
		}

		this.latencyValues.push(time - this.lastLatencyTime);
	}

	/**
	 * Get the current latency.
	 *
	 * @returns
	 *   estimated latency to the peer in milliseconds
	 */
	public get latency() {
		if(this.latencyValues.length === 0) {
			throw new Error('Latency unknown');
		}

		let sum = 0;
		for(const v of this.latencyValues) {
			sum += v;
		}

		return Math.floor(sum / this.latencyValues.length);
	}

	/**
	 * Send data to this peer.
	 *
	 * @param type -
	 *   type of message being sent
	 * @param payload -
	 *   data of message
	 */
	public abstract send<T extends PeerMessageType>(type: T, payload: PeerMessage<T>): Promise<void>;
}
