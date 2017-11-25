'use strict';

const Service = require('./service');
const customInspect = require('util').inspect.custom;

let seq = 0;

module.exports = class RemoteService extends Service {
	constructor(parent, node, def) {
		super();

		this.parent = parent;

		this.debug = require('debug')('ataraxia:service:' + def.id);

		this.node = node;

		this.id = def.id;
		this.metadata = def.metadata;

		this.promises = new Map();

		this.subscribedToEvents = false;
	}

	updateDefinition(def) {
		this.metadata = def.metadata;
	}

	_updateListenerRegistration() {
		if(this.events.listenersAny().length > 0 || this.events.eventNames().length > 0) {
			// We have listeners, make sure we are subscribed
			if(this.unsubscribeTimeout) {
				clearTimeout(this.unsubscribeTimeout);
				this.unsubscribeTimeout = null;
			}

			if(this.subscribedToEvents) return;

			// TODO: ACK for subscriptions?
			this.subscribedToEvents = true;
			this.node.send('service:subscribe', {
				service: this.id
			});
		} else {
			// No listeners, clear our subscription
			if(! this.subscribedToEvents) return;

			this.unsubscribeTimeout = setTimeout(() => {
				clearTimeout(this.unsubscribeTimeout);
				this.subscribedToEvents = false;

				this.node.send('service:unsubscribe', {
					service: this.id
				});
			}, 1000);
		}
	}

	on(event, listener) {
		super.on(event, listener);

		this._updateListenerRegistration();
	}

	onAny(listener) {
		super.onAny(listener);

		this._updateListenerRegistration();
	}

	off(event, listener) {
		super.off(event, listener);

		this._updateListenerRegistration();
	}

	offAny(listener) {
		super.offAny(listener);

		this._updateListenerRegistration();
	}

	receiveEvent(name, payload) {
		this.emitEvent(name, payload);
	}

	call(action, args) {
		const id = seq++;
		if(seq > 100000) seq = 0;

		return new Promise((resolve, reject) => {
			const promise = { resolve, reject };
			this.promises.set(id, promise);

			this.debug('Calling', action, 'via node', this.node);
			this.node.send('service:invoke', {
				service: this.id,
				seq: id,
				action: action,
				arguments: args
			});

			promise.timeout = setTimeout(() => {
				promise.reject(new Error('Call timed out'));
				this.promises.delete(id);
			}, 30000);
		})
	}

	receiveReply(message) {
		const promise = this.promises.get(message.seq);
		if(! promise) return;

		if(message.error) {
			promise.reject(new Error(message.error));
		} else {
			promise.resolve(message.result);
		}

		clearTimeout(promise.timeout);
		this.promises.delete(message.seq);
	}

	remove() {
		for(const promise of this.promises.values()) {
			promise.reject(new Error('Service is no longer available'));
		}
	}

	[customInspect]() {
		return 'RemoteService[' + this.id + ' on ' + this.node.id + ']';
	}
}
