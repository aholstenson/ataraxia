import { Event, Subscribable } from 'atvik';
import debug from 'debug';

import {
	Group,
	Network,
	NamedGroup,
	Node,
	MessageUnion,
	RequestReplyHelper
} from 'ataraxia';
import { ServiceContract } from 'ataraxia-service-contracts';

import { ServiceDef } from './defs/ServiceDef';
import {
	ServiceMessages,
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
import { LocalServiceReflect } from './reflect/LocalServiceReflect';
import { MergedServiceReflect } from './reflect/MergedServiceReflect';
import { RemoteServiceHelper } from './reflect/RemoteServiceHelper';
import { RemoteServiceReflect } from './reflect/RemoteServiceReflect';
import { ServiceReflect } from './reflect/ServiceReflect';
import { Service } from './Service';
import { ServiceHandle } from './ServiceHandle';
import { ServiceImpl } from './ServiceImpl';
import { ServiceInfo } from './ServiceInfo';

/**
 * Type definition for local services. Supports three cases:
 *
 * * Already constructed instance
 * * Function that takes a `ServiceHandle` and returns instance
 * * Constructor that takes a `ServiceHandle`
 */
export type LocalService<T> = T
	| ((handle: ServiceHandle) => T)
	| (new (handle: ServiceHandle) => T);

/**
 * Distributed service registry for exposing and consuming remote services.
 *
 * ```javascript
 * const services = new Services(net);
 *
 * // Join the services
 * await services.join();
 * ```
 *
 * ## Service contracts
 *
 * The service support is built around contracts that define what methods and
 * events are supported. Contracts are defined using {@link ServiceContract}:
 *
 * ```javascript
 * const EchoService = new ServiceContract()
 *   .defineMethod('echo', {
 *      returnType: stringType,
 *      parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *      ]
 *   })
 *   .defineEvent('onEcho', {
 *     parameters: [
 *       {
 *         name: 'message',
 *         type: stringType
 *       }
 *     ]
 *   });
 * ```
 *
 * ## Implementing and registering services
 *
 * When a contract has been defined it should be implemented, either as a class
 * or as a one-off instance.
 *
 * ### Classes
 *
 * Classes are commonly implemented using a decorator to indicate what contract
 * they support:
 *
 * ```javascript
 * @serviceContract(EchoService)
 * class EchoServiceImpl {
 *   constructor() {
 *     this.echoEvent = new AsyncEvent(this);
 *   }
 *
 *   get onEcho() {
 *     return this.echoEvent.subscribable;
 *   }
 *
 *   async echo(message) {
 *     this.echoEvent.emit(message);
 *     return message;
 *   }
 * }
 *
 * // Register a new instance
 * services.register('echo', new EchoServiceImpl());
 * ```
 *
 * ### Instance
 *
 * Instance implementations are useful for singleton services without events:
 *
 * ```javascript
 * const NoEventEchoService = new ServiceContract()
 *   .defineMethod('echo', {
 *      returnType: stringType,
 *      parameters: [
 *        {
 *           name: 'message',
 *           type: stringType
 *        }
 *      ]
 *   });
 *
 * // Implement the contract
 * const instance = NoEventEchoService.implement({
 *   async echo(message) {
 *     return message;
 *   }
 * });
 *
 * // Register the instance
 * services.register('echo', instance);
 * ```
 *
 * ## Consuming services
 *
 * {@link Service}s are commonly consumed either by their identifier or
 * dynamically using events.
 *
 * ### Events
 *
 * It is possible to listen for events becoming available and unavailable using
 * {@link onServiceAvailable} and {@link onServiceUnavailable}:
 *
 * ```javascript
 * services.onServiceAvailable(service => {
 *   // Do something with the service here
 * });
 *
 * services.onServiceUnavailable(service => {
 *   // Stop doing something with the service
 * });
 * ```
 *
 * Updates to services can occur if multiple instances are registered for the
 * same id, in which case they are merged and update events emitted if the
 * supported methods and events change:
 *
 * ```javascript
 * services.onServiceUpdate(service => {
 *   // Service has been updated, determine if we are still interested in it
 * });
 * ```
 *
 * ### Getting specific services
 *
 * {@link get} can be used to get a service based on a known identifier. Doing
 * so allows you to determine its availability, listen to changes, events and
 * invoke methods.
 *
 * ```javascript
 * const service = services.get('echo');
 *
 * if(service.available) {
 *   await service.call('echo', 'Hello world!');
 * }
 * ```
 *
 * Events are available on the service instance and can be used to listen for
 * changes to it, see {@link Service.onAvailable}, {@link Service.onUnavailable}
 * and {@link Service.onUpdate}.
 *
 * ### Creating proxies
 *
 * Creating a proxy is the recommended way to call methods and listen to events
 * from a service. It allows for a very similar style of use for services that
 * are remote as for services that are local.
 *
 * Proxies are created from a contract and use the methods and events defined
 * in them to create the proxied instance:
 *
 * ```javascript
 * const echoService = service.as(EchoService);
 * ```
 *
 * A proxied service can then be called as a normal class:
 *
 * ```javascript
 * const result = await echoService.echo('Hello world!');
 * ```
 *
 * Events work similar to how they would locally:
 *
 * ```javascript
 * await echoService.onEcho(message => console.log('Echoed:', message));
 * ```
 *
 * Methods in a contract will become a method on the proxy that returns a
 * `Promise`, so method calls must always be awaited to retrieve the result.
 * Events will become an instance of {@link AsyncSubscribable}.
 */
export class Services {
	private readonly debug: debug.Debugger;
	private readonly nodes: Map<string, ServiceNodeData>;
	private readonly group: Group<ServiceMessages>;

	private readonly serviceAvailableEvent: Event<this, [ service: Service ]>;
	private readonly serviceUnavailableEvent: Event<this, [ service: Service ]>;
	private readonly serviceUpdateEvent: Event<this, [ service: Service ]>;

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
	 * Information about local and remote services.
	 */
	private readonly _services: Map<string, ServiceInfo>;

	private readonly calls: RequestReplyHelper<any>;

	public constructor(network: Network) {
		this.debug = debug('ataraxia:' + network.name + ':services');
		this.nodes = new Map();

		this.serviceAvailableEvent = new Event(this);
		this.serviceUnavailableEvent = new Event(this);
		this.serviceUpdateEvent = new Event(this);

		this.version = 0;

		this.group = new NamedGroup(network, 'services');
		this.group.onMessage(this.handleMessage.bind(this));
		this.group.onNodeAvailable(this.handleNodeAvailable.bind(this));
		this.group.onNodeUnavailable(this.handleNodeUnavailable.bind(this));

		this.localServices = new Map();
		this._services = new Map();

		this.calls = new RequestReplyHelper({
			timeout: 60000
		});
	}

	/**
	 * Event emitted when a service becomes available.
	 *
	 * @returns
	 *   subscribable
	 */
	public get onServiceAvailable(): Subscribable<this, [ service: Service ]> {
		return this.serviceAvailableEvent.subscribable;
	}

	/**
	 * Event emitted when a service becomes unavailable.
	 *
	 * @returns
	 *   subscribable
	 */
	public get onServiceUnavailable(): Subscribable<this, [ service: Service ]> {
		return this.serviceUnavailableEvent.subscribable;
	}

	/**
	 * Event emitted when a service is updated.
	 *
	 * @returns
	 *   subscribable
	 */
	public get onServiceUpdate(): Subscribable<this, [ service: Service ]> {
		return this.serviceUpdateEvent.subscribable;
	}

	/**
	 * Join the services layer allowing access to remote services.
	 *
	 * @returns
	 *   promise that resolves when services have started
	 */
	public join(): Promise<void> {
		return this.group.join();
	}

	/**
	 * Leave the services no longer allowing access to remote services.
	 *
	 * @returns
	 *   promise that resolves when services have stopped
	 */
	public leave(): Promise<void> {
		return this.group.leave();
	}

	/**
	 * Register an object using a specific identifier.
	 *
	 * @param id -
	 *   identifier of the service
	 * @param instanceOrFactory -
	 *   instance to expose or factory for the instance
	 * @returns
	 *   handle that can be used to remove service
	 */
	public register(id: string, instanceOrFactory: LocalService<object>): ServiceHandle;

	/**
	 * Register an object that contains a service identifier.
	 *
	 * @param instanceOrFactory -
	 *   instance to expose or factory for the instance
	 * @returns
	 *   handle that can be used to remove service
	 */
	public register(instanceOrFactory: LocalService<{ serviceId: string }>): ServiceHandle;

	/**
	 * Register a new service that should be made available locally and
	 * remotely to other nodes.
	 *
	 * @param idOrInstance -
	 *   identifier of service, or an object with the serviceId property
	 * @param instance -
	 *   instance to register with
	 * @returns
	 *   handle that can be used to remove service
	 */
	public register(
		idOrInstance: string | LocalService<{ serviceId: string }>,
		instance?: LocalService<object>
	): ServiceHandle {
		const handle = new ServiceHandleImpl();
		const actualInstanceOrFactory = typeof idOrInstance === 'string'
			? instance
			: idOrInstance;

		if(! actualInstanceOrFactory) {
			throw new Error('An instance or factory to create it is required');
		}

		let service: object;
		if(typeof actualInstanceOrFactory === 'function') {
			/*
			 * The service is being registered either using a factory function
			 * or as a class.
			 */
			try {
				service = Reflect.construct(actualInstanceOrFactory, [ handle ]);
			} catch(ex) {
				// TODO: This should probably check the error
				service = (actualInstanceOrFactory as any)(handle);
			}
		} else {
			service = actualInstanceOrFactory;
		}

		// Get the identifier from the argument or service instance
		const id = typeof idOrInstance === 'string'
			? idOrInstance
			: (service as any).serviceId as string | undefined;

		if(typeof id !== 'string' || id.trim() === '') {
			throw new Error('Services must have a non-empty id');
		}

		// Get the contract being implemented
		const contract = ServiceContract.get(service);
		if(! contract) {
			throw new Error('Unable to determine service contract, use ServiceContract.implement, define a property serviceContract or check that your class is decorated');
		}

		let registration = this.localServices.get(id);
		if(! registration) {
			registration = {
				nodeSubscriptionHandles: new Map(),

				reflect: new MergedServiceReflect(id)
			};

			this.localServices.set(id, registration);
		}

		// Create the reflect used to call methods of the local service
		const reflect = new LocalServiceReflect(id, contract, service);
		handle.unregisterService = () => this.unregister(reflect);

		// Register the service
		registration.reflect.addReflect(reflect);
		this.version++;

		// Broadcast that the service is now available
		this.group.broadcast('service:available', {
			version: this.version,
			def: toServiceDef(reflect)
		}).catch(err => this.debug('Error occurred during service broadcast', err));

		// Expose it to the local instance
		this.registerServiceReflect(reflect);

		return handle;
	}

	/**
	 * Unregister a previously registered service.
	 *
	 * @param reflect -
	 *   instance to remove
	 */
	private unregister(reflect: ServiceReflect) {
		const registration = this.localServices.get(reflect.id);
		if(! registration) return;

		// Remove the reflect instance from the local service
		registration.reflect.removeReflect(reflect);

		// Increase the local version
		this.version++;

		if(! registration.reflect.hasReflects()) {
			// No more reflects means the service is no longer available locally
			this.localServices.delete(reflect.id);

			// Broadcast that the service is no longer available
			this.group.broadcast('service:unavailable', {
				version: this.version,
				service: reflect.id
			}).catch(err => this.debug('Error occurred during service broadcast', err));
		} else {
			// Broadcast the changed service
			this.group.broadcast('service:available', {
				version: this.version,
				def: toServiceDef(reflect)
			}).catch(err => this.debug('Error occurred during service broadcast', err));
		}

		// Unregister locally
		this.unregisterServiceReflect(reflect);
	}

	/**
	 * Get information about a service with the given identifier.
	 *
	 * @param id -
	 *   the identifier of the service
	 * @returns
	 *   `Service` instance or `null` if service is unavailable
	 */
	public get(id: string): Service {
		const service = this._services.get(id);
		if(service) {
			// Service is currently registered, fetch the instance from it
			return service.instance;
		} else {
			// Service is not registered - create a new instance
			return this.createServiceImpl(id);
		}
	}

	/**
	 * Register a reflect for the given identifier.
	 *
	 * @param reflect -
	 *   reflect instance for the service
	 */
	private registerServiceReflect(
		reflect: ServiceReflect
	) {
		let service = this._services.get(reflect.id);
		let emitAvailable = false;
		if(! service) {
			// Create the new service if not available
			service = new ServiceInfo(reflect.id, this.createServiceImpl(reflect.id));
			this._services.set(reflect.id, service);

			emitAvailable = true;
		}

		service.addReflect(reflect);

		if(emitAvailable) {
			this.serviceAvailableEvent.emit(service.instance);
		} else {
			this.serviceUpdateEvent.emit(service.instance);
		}
	}

	private createServiceImpl(id: string): ServiceImpl {
		return new ServiceImpl(this, id, () => {
			const s = this._services.get(id);
			if(! s) {
				throw new Error('No implementations of the service ' + id + ' are available');
			}

			return s.reflect;
		});
	}

	/**
	 * Update a `ServiceReflect` with a new one.
	 *
	 * @param currentReflect -
	 *   current reflect instance
	 * @param newReflect -
	 *   new reflect instance
	 */
	private updateServiceReflect(
		currentReflect: ServiceReflect,
		newReflect: ServiceReflect
	) {
		const service = this._services.get(currentReflect.id);
		if(! service) return;

		// TODO: Check if reflects are equivalent and abort

		service.removeReflect(currentReflect);
		service.addReflect(newReflect);

		this.serviceUpdateEvent.emit(service.instance);
	}

	/**
	 * Unregister a `ServiceReflect`.
	 *
	 * @param reflect -
	 *   reflect instance
	 */
	private unregisterServiceReflect(
		reflect: ServiceReflect
	) {
		const service = this._services.get(reflect.id);
		if(! service) return;

		service.removeReflect(reflect);

		if(! service.reflect.hasReflects()) {
			this._services.delete(reflect.id);

			this.serviceUnavailableEvent.emit(service.instance);
		}
	}

	/**
	 * Handle a new node joining the service group. Will request a list of
	 * services from the joining node.
	 *
	 * @param node -
	 *   node that is now available
	 */
	private handleNodeAvailable(node: Node<ServiceMessages>) {
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
	 * Handle a node leaving the service group.
	 *
	 * @param node -
	 *   node that is now unavailable
	 */
	private handleNodeUnavailable(node: Node<ServiceMessages>) {
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
	 * group.
	 *
	 * @param msg -
	 *   incoming message
	 */
	private handleMessage(msg: MessageUnion<ServiceMessages>) {
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
	private handleServiceListRequest(node: Node<ServiceMessages>, message: ServiceListRequestMessage) {
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
	private handleServiceListReply(node: Node<ServiceMessages>, message: ServiceListReplyMessage) {
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
	private handleServiceAvailable(node: Node<ServiceMessages>, message: ServiceAvailableMessage) {
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
	private handleServiceUnavailable(node: Node<ServiceMessages>, message: ServiceUnavailableMessage) {
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
	private handleServiceInvokeRequest(node: Node<ServiceMessages>, message: ServiceInvokeRequest) {
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
	private handleServiceInvokeReply(message: ServiceInvokeReply) {
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
	private handleServiceEventSubscribe(node: Node<ServiceMessages>, message: ServiceEventSubscribeMessage) {
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
	private handleServiceEventUnsubscribe(node: Node<ServiceMessages>, message: ServiceEventUnsubscribeMessage) {
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
	private handleServiceEventEmit(node: Node<ServiceMessages>, message: ServiceEventEmitMessage) {
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
					self.calls.registerError(id, err instanceof Error ? err : new Error(String(err)));
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
		methods: reflect.methods,
		events: reflect.events
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
	readonly reflect: MergedServiceReflect;

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
