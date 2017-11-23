'use strict';

const { EventEmitter2 } = require('eventemitter2');

module.exports = class Service {
	constructor() {
		this.events = new EventEmitter2();
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
