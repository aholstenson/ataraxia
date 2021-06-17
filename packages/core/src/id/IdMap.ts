import { encodeId } from 'ataraxia-transport';

/**
 * `Map`-like structure where keys are buffers with identifiers.
 */
export class IdMap<T> {
	private data: Map<string, T>;

	public constructor() {
		this.data = new Map();
	}

	/**
	 * Associate the given id with some data.
	 *
	 * @param id -
	 *   buffer with id
	 * @param data -
	 *   data of id
	 */
	public set(id: ArrayBuffer, data: T) {
		this.data.set(encodeId(id), data);
	}

	/**
	 * Get data associated with the given id.
	 *
	 * @param id -
	 *   buffer with id
	 * @returns
	 *   associated data or `undefined`
	 */
	public get(id: ArrayBuffer): T | undefined {
		return this.data.get(encodeId(id));
	}

	/**
	 * Delete data associated with the given id.
	 *
	 * @param id -
	 *   buffer with id
	 */
	public delete(id: ArrayBuffer) {
		this.data.delete(encodeId(id));
	}

	/**
	 * Get the values in this map.
	 *
	 * @returns
	 *   iterator with values
	 */
	public values() {
		return this.data.values();
	}

	/**
	 * Get the size of this map.
	 *
	 * @returns
	 *   size
	 */
	public size() {
		return this.data.size;
	}
}
