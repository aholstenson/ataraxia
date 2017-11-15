'use strict';

module.exports = function() {
	return Date.now().toString(36) +
		Math.floor((1 + Math.random()) * 0x10000).toString(36);
};
