'use strict';

/**
 * Simple encoding to custom characters.
 */
const ENCODING = '0123456789abcdefghijlkmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function encode(number) {
	let radix = ENCODING.length;
	let parts = [];
	while(number > radix) {
		parts.push(ENCODING[number % radix]);
		number = Math.floor(number / radix);
	}

	parts.push(ENCODING[number]);
	return parts.reverse().join('');
}

// Epoch is a base date to make the millisecond part of the id smaller
const EPOCH = Date.UTC(2017, 1, 1);

/**
 * Generate identifiers that can be used to represent nodes. These are designed
 * to be fairly unique, in that they use a millisecond timestamp combined with
 * a random number.
 *
 * This is similar to flake implementations but does not give as strong
 * guarantee that identifiers will be unique if many are generated at the
 * same millisecond.
 *
 * @returns
 *   String representing the identifier.
 */
module.exports = function() {
	// Combine time with a random number
	return encode(Date.now() - EPOCH) +
		encode(Math.floor((1 + Math.random()) * 0x10000));
};
