import { encodeId } from 'ataraxia-transport';

/**
 * Set for keeping track of identifiers.
 */
export class IdSet {
	private data: Map<string, ArrayBuffer>;

	public constructor(values?: IterableIterator<ArrayBuffer>) {
		this.data = new Map();
		if(values) {
			for(const v of values) {
				this.add(v);
			}
		}
	}

	/**
	 * Add an identifier to this set.
	 *
	 * @param id -
	 *   buffer with id
	 */
	public add(id: ArrayBuffer) {
		this.data.set(encodeId(id), id);
	}

	/**
	 * Check if a given identifier is in the set.
	 *
	 * @param id -
	 *   buffer with id
	 * @returns
	 *   `true` if id exists in set
	 */
	public has(id: ArrayBuffer) {
		return this.data.has(encodeId(id));
	}

	/**
	 * Delete an identifier from the set.
	 *
	 * @param id -
	 *   buffer with id
	 */
	public delete(id: ArrayBuffer) {
		this.data.delete(encodeId(id));
	}

	/**
	 * Get the number of identifiers in this set.
	 *
	 * @returns
	 *   size
	 */
	public get size() {
		return this.data.size;
	}

	/**
	 * Get all the identifiers in this set.
	 *
	 * @returns
	 *   iterator with values
	 */
	public values(): IterableIterator<ArrayBuffer> {
		return this.data.values();
	}
}
