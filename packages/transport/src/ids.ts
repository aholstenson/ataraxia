import { randomBytes } from './randomBytes';

/*
 * Simple encoding to custom characters.
 */
const ENCODING = '0123456789abcdefghijlkmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const REVERSE_ENCODING: { [key: string]: number } = {};
for(let i = 0; i < ENCODING.length; i++) {
	REVERSE_ENCODING[ENCODING.charAt(i)] = i;
}

const SIZE = ENCODING.length;

/**
 * Encode a binary identifier to a string.
 *
 * @param id -
 *   identifier
 * @returns
 *   encoded string
 */
export function encodeId(id: ArrayBuffer): string {
	const u8 = new Uint8Array(id);
	const digits: number[] = [ 0 ];
	for(let i = 0; i < u8.length; i++) {
		let j = 0;
		let carry = u8[i];
		while(j in digits || carry) {
			let n = digits[j];
			n = n ? (n << 8) + carry : carry;
			carry = n / SIZE | 0;
			digits[j] = n % SIZE;
			j++;
		}
	}

	const encoded = [];
	for(let j = digits.length - 1; j >= 0; j--) {
		encoded.push(ENCODING[digits[j]]);
	}
	return encoded.join('');
}

/**
 * Decode a string into a binary identifier.
 *
 * @param input -
 *   string to decode
 * @returns
 *   decoded string
 */
export function decodeId(input: string): ArrayBuffer {
	if(input.length === 0) {
		return new ArrayBuffer(0);
	}

	const bytes = [ 0 ];
	let i = 0;
	while(i < input.length) {
		const character = input.charAt(i);
		let j = 0;
		while(j < bytes.length) {
			bytes[j] *= SIZE;
			j++;
		}

		bytes[0] += REVERSE_ENCODING[character];
		let carry = 0;
		j = 0;

		while(j < bytes.length) {
			bytes[j] += carry;
			carry = bytes[j] >> 8;
			bytes[j] &= 0xFF;
			j++;
		}

		while(carry) {
			bytes.push(carry & 0xFF);
			carry >>= 8;
		}

		i++;
	}

	i = 0;
	const first = ENCODING.charAt(i);
	while(input.charAt(i) === first && i < input.length - 1) {
		bytes.push(0);
		i++;
	}

	return new Uint8Array(bytes.reverse()).buffer;
}

/**
 * Generate identifiers that can be used to represent nodes. These are a random
 * UUID, generates 16 bytes of data and sets the markers used for UUID v4.
 *
 * @returns
 *   buffer with id
 */
export function generateId(): ArrayBuffer {
	const bytes = randomBytes(16);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	return bytes.buffer;
}

const NO_ID = new ArrayBuffer(0);
/**
 * Helper that returns a buffer representing no identifier.
 *
 * @returns
 *   empty buffer
 */
export function noId(): ArrayBuffer {
	return NO_ID;
}

/**
 * Check if two identifiers are the same.
 *
 * @param o1 -
 *   first buffer
 * @param o2 -
 *   second buffer
 * @returns
 *   `true` if buffers match
 */
export function sameId(o1: ArrayBuffer, o2: ArrayBuffer): boolean {
	if(o1.byteLength !== o2.byteLength) return false;

	const u1 = new Uint8Array(o1);
	const u2 = new Uint8Array(o2);
	for(let i = 0; i < u1.length; i++) {
		if(u1[i] !== u2[i]) return false;
	}

	return true;
}
