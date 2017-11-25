'use strict';

const { EventEmitter2 } = require('eventemitter2');
const proxy = require('./service-proxy');

module.exports = class Service {
	constructor() {
		this.events = new EventEmitter2();

		// Create the public proxy
		this.proxy = proxy(this);
	}

	emitEvent(event, data) {
		this.events.emit(event, data);
	}

	on(event, listener) {
		this.events.on(event, listener);
	}

	off(event, listener) {
		this.events.off(event, listener);
	}

	onAny(listener) {
		this.events.onAny(listener);
	}

	offAny(listener) {
		this.events.offAny(listener);
	}
}
