/*
 * Simple encoding to custom characters.
 */
const ENCODING = '0123456789abcdefghijlkmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const REVERSE_ENCODING: { [key: string]: number } = {};
for(let i=0; i<ENCODING.length; i++) {
	REVERSE_ENCODING[ENCODING.charAt(i)] = i;
}

const SIZE = ENCODING.length;

export function encodeId(id: ArrayBuffer): string {
	const u8 = new Uint8Array(id);
	const digits: number[] = [ 0 ];
	//let j = 0;
	for(let i=0; i<u8.length; i++) {

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
	for(let j=digits.length-1;j>=0; j--) {
		encoded.push(ENCODING[digits[j]]);
	}
	return encoded.join('');
}

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
export function generateId(): ArrayBuffer {
	// Combine time with a random number
	const time = Date.now() - EPOCH;
	const random = Math.floor((Math.random()) * 4194304);

	const buffer = new ArrayBuffer(8);
	const view = new DataView(buffer);
	view.setUint32(0, Math.floor(time / 1024) & 0xFFFFFFFF, false);
	view.setUint32(4, ((time & 1023) << 24) | random, false);

	return buffer;
}

const NO_ID = new ArrayBuffer(0);
export function noId(): ArrayBuffer {
	return NO_ID;
}

/**
 * Check if two identifiers are the same.
 *
 * @param o1
 * @param o2
 */
export function sameId(o1: ArrayBuffer, o2: ArrayBuffer): boolean {
	if(o1.byteLength !== o2.byteLength) return false;

	const u1 = new Uint8Array(o1);
	const u2 = new Uint8Array(o2);
	for(let i=0; i<u1.length; i++) {
		if(u1[i] !== u2[i]) return false;
	}

	return true;
}

export function compareId(o1: ArrayBuffer, o2: ArrayBuffer): number {
	if(o1.byteLength < o2.byteLength) return -1;
	if(o1.byteLength > o2.byteLength) return 1;

	const u1 = new Uint8Array(o1);
	const u2 = new Uint8Array(o2);
	for(let i=0; i<u1.length; i++) {
		if(u1[i] < u2[i]) return -1;
		if(u1[i] > u2[i]) return 1;
	}

	return 0;
}
