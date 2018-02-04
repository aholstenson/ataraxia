'use strict';

const { EventEmitter } = require('events');
const wrapped = Symbol('wrapped');
const customInspect = require('util').inspect.custom;

/**
 * Node in the network. Thin wrapper around a topology node to provide a
 * simple consistent API suitable for public use.
 */
module.exports = class Node extends EventEmitter {

	/**
	 * Create a new node.
	 *
	 * @param {TopologyNode} other
	 */
	constructor(other) {
		super();

		this[wrapped] = other;
	}

	/**
	 * Get the identifier of this node.
	 */
	get id() {
		return this[wrapped].id;
	}

	/**
	 * Send a message to this node.
	 */
	send(type, payload) {
		this[wrapped].send(type, payload);
	}

	/**
	 * Get if this node is currently reachable.
	 */
	get reachable() {
		return this[wrapped].reachable;
	}

	[customInspect]() {
		return 'Node{' + this.id + '}';
	}
};
