import { SynchronizedValues, SynchronizedValuesOptions } from '../src/SynchronizedValues';
import { TestNetwork } from '../src/test';

const sleep = (len: number = 100) => {
	return new Promise(resolve => setTimeout(resolve, len));
};

const instance = (name: string, stateName: string = 'test', options?: SynchronizedValuesOptions<any>) => {
	const net = testNetwork.network(name);

	const result = new SynchronizedValues(net, stateName, options);
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
});
