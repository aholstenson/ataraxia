import { generateId, encodeId } from '../src/id';

describe('Identifiers', function() {
	it('Can generate random id', function() {
		generateId();
	});

	it('Fairly unique id test', function() {
		const set = new Set();
		for(let i=0; i<1000; i++) {
			const id = encodeId(generateId());
			if(set.has(id)) {
				throw new Error('Duplicate id generated: ' + id);
			}

			set.add(id);
		}
	});
});
