import debug from 'debug';
import { Event, SubscriptionHandle } from 'atvik';
import { Network, Exchange, Node, MessageUnion } from 'ataraxia';

import {
	ServiceMessages,
	ServiceDef,
	ServiceListRequestMessage,
	ServiceListReplyMessage,
	ServiceInvokeRequest,
	ServiceInvokeReply,
	ServiceAvailableMessage,
	ServiceUnavailableMessage
} from './messages';

import { Service } from './Service';
import { ServiceHandle } from './ServiceHandle';
import { LocalService } from './LocalService';
import { ServiceImpl } from './ServiceImpl';

import { ServiceReflect } from './reflect';
import { RequestReplyHelper } from './RequestReplyHelper';
import { RemoteServiceReflect, RemoteServiceHelper } from './reflect/remote';
import { LocalServiceReflect } from './reflect/local';
import { ServiceEventSubscribeMessage } from './messages/ServiceEventSubscribeMessage';
import { ServiceEventUnsubscribeMessage } from './messages/ServiceEventUnsubscribeMessage';
import { ServiceEventEmitMessage } from './messages/ServiceEventEmitMessage';

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

	constructor(network: Network) {
		this.debug = debug('ataraxia:' + network.networkName + ':services');
		this.nodes = new Map();

		this.serviceAvailableEvent = new Event(this);
		this.serviceUnavailableEvent = new Event(this);
		this.serviceUpdatedEvent = new Event(this);

		this.version = 0;

		this.exchange = new Exchange(network, 'service');
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
	 * Start the services allowing access to remote services.
	 */
	public start(): Promise<void> {
		return this.exchange.join();
	}

	/**
	 * Stop the services no longer allowing access to remote services.
	 */
	public stop(): Promise<void> {
		return this.exchange.leave();
	}

	/**
	 * Register a new service that should be made available locally and
	 * remotely to other nodes.
	 *
	 * @param serviceDef
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
	 * Get a service if it is available.
	 *
	 * @param id
	 *   the identifier of the service
	 */
	public get<S extends object>(id: string): (Service & S) | null {
		const service = this.services.get(id);
		return service ? service.proxy : null;
	}

	/**
	 * Register a reflect for the given identifier.
	 *
	 * @param serviceId
	 * @param reflect
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
	 * @param serviceId
	 * @param reflect
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
	 * Update a `ServiceReflect` with a new one.
	 *
	 * @param serviceId
	 * @param reflect
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
	 * Handle a new node joining the exchange. Will request a list of services
	 * from the joining node.
	 *
	 * @param node
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
				for(const handle of events.values()) {
					handle.unsubscribe();
				}
				service.nodeSubscriptionHandles.delete(node.id);
			}
		}
	}

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

	protected handleServiceInvokeReply(message: ServiceInvokeReply) {
		if(typeof message.error === 'string') {
			this.calls.registerError(message.id, new Error(message.error));
		} else {
			this.calls.registerReply(message.id, message.result);
		}
	}

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
		const handle = service.reflect.subscribe(message.event, (...args) => {
			node.send('service:event-emit', {
				service: service.reflect.id,
				event: event,
				arguments: args
			})
				.catch(err => this.debug('Unable to send event', event, 'with arguments', args, ':', err));
		});

		events.set(event, handle as any);
	}

	protected handleServiceEventUnsubscribe(node: Node<ServiceMessages>, message: ServiceEventUnsubscribeMessage) {
		const service = this.localServices.get(message.service);
		if(! service) return;

		const events = service.nodeSubscriptionHandles.get(node.id);
		if(! events) return;

		const handle = events.get(message.event);
		if(handle) {
			handle.unsubscribe();
			events.delete(node.id);

			if(events.size === 0) {
				// No more events, delete from the main map
				service.nodeSubscriptionHandles.delete(node.id);
			}
		}
	}

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
 * @param reflect
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
	readonly nodeSubscriptionHandles: Map<string, Map<string, SubscriptionHandle>>;
}

class ServiceHandleImpl implements ServiceHandle {
	public id: string;
	public unregisterService?: () => void;

	constructor() {
		this.id = '';
	}

	public unregister() {
		if(! this.unregisterService) {
			throw new Error('No way to unregister service found');
		}

		this.unregisterService();
	}
}
