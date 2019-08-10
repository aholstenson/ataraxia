import { encodeId } from './ids';

export class IdSet {
	private data: Map<string, ArrayBuffer>;

	constructor(values?: IterableIterator<ArrayBuffer>) {
		this.data = new Map();
		if(values) {
			for(const v of values) {
				this.add(v);
			}
		}
	}

	public add(id: ArrayBuffer) {
		this.data.set(encodeId(id), id);
	}

	public has(id: ArrayBuffer) {
		return this.data.has(encodeId(id));
	}

	public delete(id: ArrayBuffer) {
		this.data.delete(encodeId(id));
	}

	get size() {
		return this.data.size;
	}

	public values(): IterableIterator<ArrayBuffer> {
		return this.data.values();
	}
}
