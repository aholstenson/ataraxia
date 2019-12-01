'use strict';

const Service = require('./service');
const customInspect = require('util').inspect.custom;
const metadataChanged = Symbol('metadataChanged');

/**
 * Service that has been registered locally.
 */
module.exports = class LocalService extends Service {
	constructor(parent, id, instance) {
		super();

		this.debug = require('debug')('ataraxia:service:' +  id);

		this.parent = parent;
		this.instance = instance;

		this.id = id;

		this.subscriptions = [];
	}

	get metadata()  {
		return this.instance.metadata;
	}

	get definition() {
		const metadata = {};
		if(this.instance.metadata) {
			for(const key of Object.getOwnPropertyNames(this.instance.metadata)) {
				let value = this.instance.metadata[key];
				if(value instanceof Set) {
					value = Array.from(value);
				}
				metadata[key] = value;
			}
		}
		return {
			id: this.id,
			metadata: metadata
		};
	}

	emitEvent(event, payload) {
		this.debug('Emitting event', event, 'with payload', payload);

		const msg = {
			service: this.id,
			instance: this.instance,
			name: event,
			payload: payload
		};

		for(const node of this.subscriptions) {
			node.send('service:event', msg);
		}

		// Trigger local listeners
		super.emitEvent(event, payload);
	}

	subscribe(node) {
		this.subscriptions.push(node);
	}

	unsubscribe(node) {
		const idx = this.subscriptions.find(n => n.id == node.id);
		if(idx >= 0) {
			this.subscriptions.splice(idx, 1);
		}
	}

	[metadataChanged]() {
		this.parent._serviceUpdated(this);
	}

	/**
	* Invoke a certain action on this device. This method will delegate to
	* the actual implementation.
	*/
	call(action, args, opts) {
		const instance = this.instance;
		const func = instance[action];
		let fr;
		if(typeof func === 'undefined') {
			/*
			 * The action was not found directly on the instance, fallback
			 * to invoking a the catch-all method.
			 */
			if(typeof instance.call === 'function') {
				try {
					fr = instance.call(action, args);
				} catch(ex) {
					if(ex instanceof Error) {
						return Promise.reject(ex);
					} else {
						return Promise.reject(new Error(ex));
					}
				}
			} else {
				return Promise.reject(new Error('No action named ' + action));
			}
		} else if(typeof func !== 'function') {
			// Action is not a function, treat as a getter
			fr = func;
		} else {
			/*
			 * Action is a function, invoke it with the incoming arguments.
			 */
			try {
				fr = func.apply(instance, args);
			} catch(ex) {
				if(ex instanceof Error) {
					return Promise.reject(ex);
				} else {
					return Promise.reject(new Error(ex));
				}
			}
		}

		return Promise.resolve(fr);
	}

	remove() {
		// Remove this service from the registry
		this.parent.remove(this.id);
	}

	[customInspect]() {
		return 'LocalService[' + this.id + ']';
	}
};

module.exports.metadataChanged = metadataChanged;
