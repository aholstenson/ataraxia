import { Event } from 'atvik';
import debug from 'debug';

import {
	Network,
	Exchange,
	Node,
	MessageUnion,
	RequestReplyHelper
} from 'ataraxia';

import { LocalService } from './LocalService';
import {
	ServiceMessages,
	ServiceDef,
	ServiceListRequestMessage,
	ServiceListReplyMessage,
	ServiceInvokeRequest,
	ServiceInvokeReply,
	ServiceAvailableMessage,
	ServiceUnavailableMessage,
	ServiceEventEmitMessage,
	ServiceEventSubscribeMessage,
	ServiceEventUnsubscribeMessage
} from './messages';
import { ServiceReflect } from './reflect';
import { LocalServiceReflect } from './reflect/local';
import { RemoteServiceReflect, RemoteServiceHelper } from './reflect/remote';
import { Service } from './Service';
import { ServiceHandle } from './ServiceHandle';
import { ServiceImpl } from './ServiceImpl';

/**
 * Type definition for local services. Supports three cases:
 *
 * * Already constructed `LocalService`
 * * Function that takes a `ServiceHandle` and returns `LocalService`
 * * Constructor that takes a `ServiceHandle`
 */
export type LocalServiceDef = LocalService
	| ((handle: ServiceHandle) => LocalService)
	| (new (handle: ServiceHandle) => LocalService);

/**
 * Distributed service registry for exposing and consuming remote services.
 */
export class Services {
	private readonly debug: debug.Debugger;
	private readonly nodes: Map<string, ServiceNodeData>;
	private readonly exchange: Exchange<ServiceMessages>;

	private readonly serviceAvailableEvent: Event<this, [ Service ]>;
	private readonly serviceUnavailableEvent: Event<this, [ Service ]>;
	private readonly serviceUpdatedEvent: Event<this, [ Service ]>;

	/**
	 * The local version, incremented whenever local services are added,
	 * removed or updated.
	 */
	private version: number;

	/**
	 * Information about services that have been registered locally.
	 */
	private readonly localServices: Map<string, LocalServiceData>;

	/**
	 * Services, both local and remote.
	 */
	private readonly services: Map<string, ServiceImpl>;

	private readonly calls: RequestReplyHelper<any>;

	public constructor(network: Network) {
		this.debug = debug('ataraxia:' + network.networkName + ':services');
		this.nodes = new Map();

		this.serviceAvailableEvent = new Event(this);
		this.serviceUnavailableEvent = new Event(this);
		this.serviceUpdatedEvent = new Event(this);

		this.version = 0;

		this.exchange = network.createExchange('service');
		this.exchange.onMessage(this.handleMessage.bind(this));
		this.exchange.onNodeAvailable(this.handleNodeAvailable.bind(this));
		this.exchange.onNodeUnavailable(this.handleNodeUnavailable.bind(this));

		this.localServices = new Map();
		this.services = new Map();

		this.calls = new RequestReplyHelper({
			timeout: 60000
		});
	}

	public get onServiceAvailable() {
		return this.serviceAvailableEvent.subscribable;
	}

	public get onServiceUnavailable() {
		return this.serviceUnavailableEvent.subscribable;
	}

	public get onServiceUpdated() {
		return this.serviceUpdatedEvent.subscribable;
	}


	/**
	 * Join the services layer allowing access to remote services.
	 *
	 * @returns
	 *   promise that resolves when services have started
	 */
	public join(): Promise<void> {
		return this.exchange.join();
	}

	/**
	 * Leave the services no longer allowing access to remote services.
	 *
	 * @returns
	 *   promise that resolves when services have stopped
	 */
	public leave(): Promise<void> {
		return this.exchange.leave();
	}

	/**
	 * Register a new service that should be made available locally and
	 * remotely to other nodes.
	 *
	 * @param serviceDef -
	 *   definition of service
	 * @returns
	 *   handle that can be used to remove service
	 */
	public register(serviceDef: LocalServiceDef): ServiceHandle {
		const handle = new ServiceHandleImpl();
		let service: LocalService;
		if(typeof serviceDef === 'function') {
			/*
			 * The service is being registered either using a factory function
			 * or as a class.
			 */
			try {
				service = Reflect.construct(serviceDef, [ handle ]);
			} catch(ex) {
				// TODO: This should probably check the error
				service = (serviceDef as any)(handle);
			}
		} else {
			service = serviceDef;
		}

		const id = service.id;
		if(typeof id !== 'string' || id.trim() === '') {
			throw new Error('Services must have a non-empty id');
		}

		if(this.localServices.has(id)) {
			throw new Error('Local service with id ' + id + ' already available');
		}

		// Create the reflect used to call methods of the local service
		const reflect = new LocalServiceReflect(service);
		handle.unregisterService = () => this.unregister(reflect);

		// Register the service
		this.localServices.set(id, {
			reflect: reflect,

			nodeSubscriptionHandles: new Map()
		});
		this.version++;

		// Broadcast that the service is now available
		this.exchange.broadcast('service:available', {
			version: this.version,
			def: toServiceDef(reflect)
		}).catch(err => this.debug('Error occurred during service broadcast', err));

		// Expose it to the local instance
		this.registerServiceReflect(reflect);

		return handle;
	}

	private unregister(reflect: ServiceReflect) {
		this.localServices.delete(reflect.id);
		this.unregisterServiceReflect(reflect);

		// Broadcast that the service is no longer available
		this.exchange.broadcast('service:unavailable', {
			version: this.version,
			service: reflect.id
		}).catch(err => this.debug('Error occurred during service broadcast', err));
	}

	/**
	 * Get a service if it is available. Will return a proxy that can be used
	 * to invoke methods on the service regardless if it is remote or local:
	 *
	 * ```javascript
	 * const instance = services.get('example:test');
	 * if(instance) {
	 *   await instance.doStuff();
	 * }
	 * ```
	 *
	 * For TypeScript it is possible to scope it to a known interface:
	 *
	 * ```typescript
	 * interface TestService {
	 *   doStuff(): Promise<void>;
	 * }
	 *
	 * const instance = services.get<TestService>('example:test');
	 * if(instance) {
	 *   await instance.doStuff();
	 * }
	 * ```
	 *
	 * @param id -
	 *   the identifier of the service
	 * @returns
	 *   `Service` instance or `null` if service is unavailable
	 */
	public get<S extends object>(id: string): (Service & S) | null {
		const service = this.services.get(id);
		return service ? service.proxy : null;
	}

	/**
	 * Register a reflect for the given identifier.
	 *
	 * @param reflect -
	 *   reflect instance for the service
	 */
	protected registerServiceReflect(
		reflect: ServiceReflect
	) {
		let service = this.services.get(reflect.id);
		let emitAvailable = false;
		if(! service) {
			// Create the new service if not available
			service = new ServiceImpl(reflect.id);
			this.services.set(reflect.id, service);

			emitAvailable = true;
		}

		service.addReflect(reflect);

		if(emitAvailable) {
			this.serviceAvailableEvent.emit(service.proxy);
		}
	}

	/**
	 * Update a `ServiceReflect` with a new one.
	 *
	 * @param currentReflect -
	 *   current reflect instance
	 * @param newReflect -
	 *   new reflect instance
	 */
	protected updateServiceReflect(
		currentReflect: ServiceReflect,
		newReflect: ServiceReflect
	) {
		const service = this.services.get(currentReflect.id);
		if(! service) return;

		// TODO: Check if reflects are equivalent and abort

		service.removeReflect(currentReflect);
		service.addReflect(newReflect);

		this.serviceUpdatedEvent.emit(service.proxy);
	}

	/**
	 * Unregister a `ServiceReflect`.
	 *
	 * @param reflect -
	 *   reflect instance
	 */
	protected unregisterServiceReflect(
		reflect: ServiceReflect
	) {
		const service = this.services.get(reflect.id);
		if(! service) return;

		service.removeReflect(reflect);

		if(! service.hasReflects()) {
			this.services.delete(reflect.id);

			this.serviceUnavailableEvent.emit(service.proxy);
		}
	}

	/**
	 * Handle a new node joining the service exchange. Will request a list of
	 * services from the joining node.
	 *
	 * @param node -
	 *   node that is now available
	 */
	protected handleNodeAvailable(node: Node<ServiceMessages>) {
		const state: ServiceNodeData = {
			node: node,
			version: 0,
			services: new Map()
		};

		this.nodes.set(node.id, state);

		node.send('service:list-request', { lastVersion: 0 })
			.catch(err => this.debug('Unable to request listing of services', err));
	}

	/**
	 * Handle a node leaving the service exchange.
	 *
	 * @param node -
	 *   node that is now unavailable
	 */
	protected handleNodeUnavailable(node: Node<ServiceMessages>) {
		const state = this.nodes.get(node.id);
		if(! state) return;

		this.nodes.delete(node.id);

		// Remove all services associated with the node
		for(const reflect of state.services.values()) {
			this.unregisterServiceReflect(reflect);
		}

		// Remove all event subscriptions on local services
		for(const service of this.localServices.values()) {
			const events = service.nodeSubscriptionHandles.get(node.id);
			if(events) {
				for(const unsubscriber of events.values()) {
					unsubscriber();
				}
				service.nodeSubscriptionHandles.delete(node.id);
			}
		}
	}

	/**
	 * Handle an incoming message from nodes that are apart of the service
	 * exchange.
	 *
	 * @param msg -
	 *   incoming message
	 */
	protected handleMessage(msg: MessageUnion<ServiceMessages>) {
		switch(msg.type) {
			case 'service:list-request':
				this.handleServiceListRequest(msg.source, msg.data);
				break;
			case 'service:list-reply':
				this.handleServiceListReply(msg.source, msg.data);
				break;
			case 'service:invoke-request':
				this.handleServiceInvokeRequest(msg.source, msg.data);
				break;
			case 'service:invoke-reply':
				this.handleServiceInvokeReply(msg.data);
				break;
			case 'service:available':
				this.handleServiceAvailable(msg.source, msg.data);
				break;
			case 'service:unavailable':
				this.handleServiceUnavailable(msg.source, msg.data);
				break;
			case 'service:event-subscribe':
				this.handleServiceEventSubscribe(msg.source, msg.data);
				break;
			case 'service:event-unsubscribe':
				this.handleServiceEventUnsubscribe(msg.source, msg.data);
				break;
			case 'service:event-emit':
				this.handleServiceEventEmit(msg.source, msg.data);
				break;
		}
	}

	/**
	 * Handle a request to list the services that we have available.
	 *
	 * @param node -
	 *   the node requesting services
	 * @param message -
	 *   details about the request
	 */
	protected handleServiceListRequest(node: Node<ServiceMessages>, message: ServiceListRequestMessage) {
		// The node has the latest version of our services
		if(message.lastVersion === this.version) return;

		const services: ServiceDef[] = [];
		for(const service of this.localServices.values()) {
			services.push(toServiceDef(service.reflect));
		}

		node.send('service:list-reply', {
			version: this.version,
			services: services
		})
			.catch(err => this.debug('Could not send reply to', node, ', error was', err));
	}

	/**
	 * Handle a reply to a previously sent service list request.
	 *
	 * @param node -
	 *   node that is replying
	 * @param message -
	 *   message with service info
	 */
	protected handleServiceListReply(node: Node<ServiceMessages>, message: ServiceListReplyMessage) {
		const data = this.nodes.get(node.id);
		if(! data) return;

		const removedServices = new Set<string>(data.services.keys());

		// Go through the current services
		for(const def of message.services) {
			const existing = data.services.get(def.id);

			// This service still exists, make sure it's not removed
			removedServices.delete(def.id);

			const id = def.id;
			const reflect = new RemoteServiceReflect(
				def,
				this.createRemoteServiceHelper(node, id)
			);

			if(existing) {
				// If the service exists it needs to be updated
				this.updateServiceReflect(existing, reflect);
			} else {
				// Register that the service is reachable through this node
				this.registerServiceReflect(reflect);
			}

			// Keep track of the service
			data.services.set(def.id, reflect);
		}

		// Remove the services that are no longer present
		for(const removed of removedServices) {
			const currentReflect = data.services.get(removed);
			if(! currentReflect) continue;

			data.services.delete(removed);
			this.unregisterServiceReflect(currentReflect);
		}

		data.version = message.version;
	}

	/**
	 * Handle an incoming broadcast that a new service is available.
	 *
	 * @param node -
	 *   node that broadcast the message
	 * @param message -
	 *   message describing the service that is now available
	 */
	protected handleServiceAvailable(node: Node<ServiceMessages>, message: ServiceAvailableMessage) {
		const data = this.nodes.get(node.id);
		if(! data) return;

		const id = message.def.id;
		const existing = data.services.get(id);

		const reflect = new RemoteServiceReflect(
			message.def,
			this.createRemoteServiceHelper(node, id)
		);

		if(existing) {
			// If the service exists it needs to be updated
			this.updateServiceReflect(existing, reflect);
		} else {
			// Register that the service is reachable through this node
			this.registerServiceReflect(reflect);
		}

		if(data.version === message.version - 1) {
			// The version we have is the previous one, perform a simple update
			data.version = message.version;
		} else {
			// There is a gap in our data, request the list of services
			node.send('service:list-request', { lastVersion: data.version })
				.catch(err => this.debug('Unable to request listing of services', err));
		}
	}

	/**
	 * Handle an incoming broadcast that a service is no longer available.
	 *
	 * @param node -
	 *   node that broadcast the message
	 * @param message -
	 *   message with the service that is no longer available
	 */
	protected handleServiceUnavailable(node: Node<ServiceMessages>, message: ServiceUnavailableMessage) {
		const data = this.nodes.get(node.id);
		if(! data) return;

		const id = message.service;
		const existing = data.services.get(id);
		if(existing) {
			data.services.delete(id);

			this.unregisterServiceReflect(existing);
		}

		if(data.version === message.version - 1) {
			// The version we have is the previous one, perform a simple update
			data.version = message.version;
		} else {
			// There is a gap in our data, request the list of services
			node.send('service:list-request', { lastVersion: data.version })
				.catch(err => this.debug('Unable to request listing of services', err));
		}
	}

	/**
	 * Handle a request to invoke a method on a local service. Delegates most
	 * of the work the local `ServiceReflect` instance.
	 *
	 * @param node -
	 *   node that requested the invocation
	 * @param message -
	 *   message describing the invocation
	 */
	protected handleServiceInvokeRequest(node: Node<ServiceMessages>, message: ServiceInvokeRequest) {
		const service = this.localServices.get(message.service);
		if(! service) {
			node.send('service:invoke-reply', {
				id: message.id,
				error: 'Service with id `' + message.service + '` is not available'
			})
				.catch(err => this.debug('Could not send reply', err));

			return;
		}

		service.reflect.apply(message.method, message.arguments)
			.catch(err => {
				return node.send('service:invoke-reply', {
					id: message.id,
					error: err instanceof Error
						? err.message + ' (method `' + message.method + '` on `' + message.service + '`)'
						: 'Could not call method `' + message.method + '` on `' + message.service + '`'
				});
			})
			.then(result => {
				return node.send('service:invoke-reply', {
					id: message.id,
					result: result
				});
			})
			.catch(err => this.debug('Could not send reply', err));
	}

	/**
	 * Handle an incoming reply to a previously sent request to invoke a
	 * method.
	 *
	 * @param message -
	 *   reply to invocation
	 */
	protected handleServiceInvokeReply(message: ServiceInvokeReply) {
		if(typeof message.error === 'string') {
			this.calls.registerError(message.id, new Error(message.error));
		} else {
			this.calls.registerReply(message.id, message.result);
		}
	}

	/**
	 * Handle a request to subscribe to a certain event.
	 *
	 * @param node -
	 *   node that wants to subscribe
	 * @param message -
	 *   message describing the event being subscribed to
	 */
	protected handleServiceEventSubscribe(node: Node<ServiceMessages>, message: ServiceEventSubscribeMessage) {
		const service = this.localServices.get(message.service);
		if(! service) return;

		let events = service.nodeSubscriptionHandles.get(node.id);
		if(events && events.has(message.event)) {
			// Already subscribed, do nothing
			return;
		}

		if(! events) {
			events = new Map();
			service.nodeSubscriptionHandles.set(node.id, events);
		}

		const event = message.event;
		const handler = (...args: any) => {
			node.send('service:event-emit', {
				service: service.reflect.id,
				event: event,
				arguments: args
			})
				.catch(err => this.debug('Unable to send event', event, 'with arguments', args, ':', err));
		};

		// Register a function that can be used to unsubscribe
		events.set(event, () => service.reflect.unsubscribe(event, handler)
			.catch(err => this.debug('Could not unsubscribe', err)));

		// Subscribe using the local reflect instance
		service.reflect.subscribe(event, handler)
			.catch(err => this.debug('Could not subscribe', err));
	}

	/**
	 * Handle a request to unsubscribe from a certain event.
	 *
	 * @param node -
	 *   node that wants to unsubscribe
	 * @param message -
	 *   message describing the event being unsubscribed from
	 */
	protected handleServiceEventUnsubscribe(node: Node<ServiceMessages>, message: ServiceEventUnsubscribeMessage) {
		const service = this.localServices.get(message.service);
		if(! service) return;

		const events = service.nodeSubscriptionHandles.get(node.id);
		if(! events) return;

		const unsubscriber = events.get(message.event);
		if(unsubscriber) {
			unsubscriber();
			events.delete(node.id);

			if(events.size === 0) {
				// No more events, delete from the main map
				service.nodeSubscriptionHandles.delete(node.id);
			}
		}
	}

	/**
	 * Handle an incoming event emit.
	 *
	 * @param node -
	 *   node that sent the event
	 * @param message -
	 *   message describing the event
	 */
	protected handleServiceEventEmit(node: Node<ServiceMessages>, message: ServiceEventEmitMessage) {
		const data = this.nodes.get(node.id);
		if(! data) return;

		const reflect = data.services.get(message.service);
		if(! reflect) return;

		reflect.emitEvent(message.event, message.arguments);
	}

	private createRemoteServiceHelper(node: Node<ServiceMessages>, service: string): RemoteServiceHelper {
		const self = this;
		return {
			async call(method, args) {
				const [ id, promise ] = self.calls.prepareRequest();

				try {
					await node.send('service:invoke-request', {
						id: id,
						service: service,
						method: method,
						arguments: args
					});
				} catch(err) {
					self.calls.registerError(id, err);
				}

				return promise;
			},

			async requestSubscribe(event) {
				await node.send('service:event-subscribe', {
					service: service,
					event: event
				});
			},

			async requestUnsubscribe(event) {
				await node.send('service:event-unsubscribe', {
					service: service,
					event: event
				});
			}
		};
	}
}

/**
 * Convert from a reflect instance to a definition suitable to transmit over
 * the network.
 *
 * @param reflect -
 *   reflect to create definition for
 * @returns
 *   instance of `ServiceDef`
 */
function toServiceDef(reflect: ServiceReflect): ServiceDef {
	return {
		id: reflect.id,
		methods: reflect.methods.map(m => ({
			name: m.name,
			parameters: m.parameters.map(p => ({
				name: p.name,
				typeId: p.typeId,
				rest: p.rest
			}))
		})),
		events: reflect.events.map(e => ({
			name: e.name,
			parameters: e.parameters.map(p => ({
				name: p.name,
				typeId: p.typeId,
				rest: p.rest
			}))
		}))
	};
}

interface ServiceNodeData {
	/**
	 * Node this data is for.
	 */
	readonly node: Node;

	/**
	 * Last service version seen for this node.
	 */
	version: number;

	/**
	 * Services for this node.
	 */
	readonly services: Map<string, RemoteServiceReflect>;
}

interface LocalServiceData {
	/**
	 * The reflect used to invoke methods and to listen to events on this
	 * service.
	 */
	readonly reflect: ServiceReflect;

	/**
	 * Mapping between node identifiers and subscription handles. First level
	 * is the node and the second level is the event name.
	 */
	readonly nodeSubscriptionHandles: Map<string, Map<string, () => void>>;
}

class ServiceHandleImpl implements ServiceHandle {
	public id: string;
	public unregisterService?: () => void;

	public constructor() {
		this.id = '';
	}

	public unregister() {
		if(! this.unregisterService) {
			throw new Error('No way to unregister service found');
		}

		this.unregisterService();
	}
}
