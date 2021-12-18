import { Node } from '../../src/Node';
import { PerNodeState, PerNodeStateOptions } from '../../src/state/PerNodeState';
import { TestNetwork } from '../../src/test';

const sleep = (len: number = 100) => {
	return new Promise(resolve => setTimeout(resolve, len));
};

const instance = (name: string, stateName: string = 'test', options?: PerNodeStateOptions<any>) => {
	const net = testNetwork.network(name);

	const result = new PerNodeState(net, stateName, options);
	cleanups.push(async () => result.destroy());
	return result;
};

let testNetwork: TestNetwork;
let cleanups: (() => Promise<any>)[];

describe('SynchronizedValues', () => {
	beforeEach(() => {
		testNetwork = new TestNetwork();
		cleanups = [
			() => testNetwork.shutdown()
		];
	});

	afterEach(async () => {
		await sleep(); // allow all pending promises to exit cleanly
		for(let i = cleanups.length - 1; i >= 0; i--) {
			await cleanups[i]();
		}
	});

	it('Default value, A -> B', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		instance('a', undefined, {
			defaultValue: 'test'
		});
		const bState = instance('b');

		let stateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'test') stateEventCount++;
		});

		await sleep();

		expect(stateEventCount).toBe(1);
	});

	it('Set, A -> B', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		const aState = instance('a');
		const bState = instance('b');

		let stateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'test') stateEventCount++;
		});

		aState.setLocal('test');
		await sleep();

		expect(stateEventCount).toBe(1);
	});

	it('Set, A <-> B', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		const aState = instance('a');
		const bState = instance('b');

		let stateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'aValue') stateEventCount++;
		});

		aState.onUpdate((node, value) => {
			if(value === 'bValue') stateEventCount++;
		});

		aState.setLocal('aValue');
		bState.setLocal('bValue');
		await sleep();

		expect(stateEventCount).toBe(2);
	});

	it('Set, A <-> B, twice', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		const aState = instance('a');
		const bState = instance('b');

		let stateEventCount = 0;
		let updatedStateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'aValue') stateEventCount++;
			if(value === 'aValueUpdated') updatedStateEventCount++;
		});

		aState.onUpdate((node, value) => {
			if(value === 'bValue') stateEventCount++;
			if(value === 'bValueUpdated') updatedStateEventCount++;
		});

		aState.setLocal('aValue');
		bState.setLocal('bValue');
		await sleep();

		aState.setLocal('aValueUpdated');
		bState.setLocal('bValueUpdated');
		await sleep();

		expect(stateEventCount).toBe(2);
		expect(updatedStateEventCount).toBe(2);
	});

	it('Sync, B creates instance after A', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		const aState = instance('a');

		aState.setLocal('test');
		await sleep();

		let stateEventCount = 0;
		const bState = instance('b');
		bState.onUpdate((node, value) => {
			if(value === 'test') stateEventCount++;
		});

		await sleep();

		expect(stateEventCount).toBe(1);
	});

	it('Sync, A -> B, connection after set', async () => {
		const aState = instance('a');
		const bState = instance('b');

		let stateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'test') stateEventCount++;
		});

		aState.setLocal('test');

		await sleep();

		expect(stateEventCount).toBe(0);

		testNetwork.bidirectional('a', 'b');
		await testNetwork.consolidate();

		await sleep();

		expect(stateEventCount).toBe(1);
	});

	it('Set, A -> B, reconnect without change', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		const aState = instance('a');
		const bState = instance('b');

		let stateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'initialValue') stateEventCount++;
		});

		aState.setLocal('initialValue');

		await sleep();

		expect(stateEventCount).toBe(1);

		testNetwork.disconnect('a', 'b');

		await testNetwork.consolidate();

		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		await sleep();

		expect(stateEventCount).toBe(1);
	});


	it('Set, A -> B, reconnect with change', async () => {
		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		const aState = instance('a');
		const bState = instance('b');

		let stateEventCount = 0;
		bState.onUpdate((node, value) => {
			if(value === 'updatedValue') stateEventCount++;
		});

		aState.setLocal('initialValue');

		await sleep();
		expect(stateEventCount).toBe(0);

		testNetwork.disconnect('a', 'b');

		await testNetwork.consolidate();

		aState.setLocal('updatedValue');

		await sleep();
		expect(stateEventCount).toBe(0);

		testNetwork.bidirectional('a', 'b');

		await testNetwork.consolidate();

		await sleep();

		expect(stateEventCount).toBe(1);
	});

	describe('Set and get, A <-> B', () => {
		let aNode: Node;
		let bNode: Node;
		let aState: PerNodeState<any>;
		let bState: PerNodeState<any>;

		beforeEach(async () => {
			testNetwork.bidirectional('a', 'b');

			await testNetwork.consolidate();

			const aNet = testNetwork.network('a');
			const bNet = testNetwork.network('b');
			expect(aNet.nodes.length).toEqual(1);
			expect(bNet.nodes.length).toEqual(1);

			aNode = bNet.nodes[0];
			bNode = aNet.nodes[0];

			aState = instance('a');
			bState = instance('b');
		});

		it('values are initially undefined', async () => {
			expect(aState.get(bNode)).toBeUndefined();
			expect(bState.get(aNode)).toBeUndefined();
		});

		it('set and get once', async () => {
			aState.setLocal('aValue');
			bState.setLocal('bValue');
			await sleep();

			expect(aState.get(bNode)).toBe('bValue');
			expect(bState.get(aNode)).toBe('aValue');
		});

		it('set and get twice', async () => {
			aState.setLocal('aValueInitial');
			bState.setLocal('bValueInitial');
			await sleep();

			expect(aState.get(bNode)).toBe('bValueInitial');
			expect(bState.get(aNode)).toBe('aValueInitial');

			aState.setLocal('aValueUpdated');
			bState.setLocal('bValueUpdated');
			await sleep();

			expect(aState.get(bNode)).toBe('bValueUpdated');
			expect(bState.get(aNode)).toBe('aValueUpdated');
		});
	});
});
