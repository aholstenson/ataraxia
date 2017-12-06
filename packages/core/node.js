'use strict';

const wrapped = Symbol('wrapped');
const customInspect = require('util').inspect.custom;

/**
 * Node in the network. Thin wrapper around a topology node to provide a
 * simple consistent API suitable for public use.
 */
module.exports = class Node {
	constructor(other) {
		this.id = other.id;
		this[wrapped] = other;
	}

	send(type, payload) {
		this[wrapped].send(type, payload);
	}

	get reachable() {
		return this[wrapped].reachable;
	}

	[customInspect]() {
		return 'Node{' + this.id + '}';
	}
};
