'use strict';

const handle = Symbol('handle');
const customInspect = require('util').inspect.custom;

const proxyHandler = {
	get: function(obj, name) {
		switch(name) {
			case handle:
				return obj;

			case 'id':
			case 'metadata':
				return obj[name];

			case customInspect:
			case 'toString':
				return obj[customInspect].bind(obj);

			case 'on':
			case 'off':
			case 'onAny':
			case 'offAny':
			case 'call':
				return obj[name].bind(obj);

			default:
				if(typeof name === 'symbol') {
					// Handle getting of symbols
					const f = obj[name];
					if(typeof t === 'function') {
						return f.bind(obj);
					} else {
						return f;
					}
				}

				// Default to calling functions
				return function(...args) {
					return obj.call(name, args);
				};
		}
	},

	set: function(obj, name, v) {
		if(typeof name === 'symbol') {
			obj[name] = v;
			return true;
		} else {
			throw new Error('Can not set property: ' + name.toString());
		}
	}
};

module.exports = function createProxy(service) {
	return new Proxy(service, proxyHandler);
};
