import { encodeId } from './ids';

export class IdMap<T> {
	private data: Map<string, T>;

	public constructor() {
		this.data = new Map();
	}

	public set(id: ArrayBuffer, data: T) {
		this.data.set(encodeId(id), data);
	}

	public get(id: ArrayBuffer) {
		return this.data.get(encodeId(id));
	}

	public delete(id: ArrayBuffer) {
		this.data.delete(encodeId(id));
	}

	public values() {
		return this.data.values();
	}

	public size() {
		return this.data.size;
	}
}
