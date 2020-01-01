import { TopologyTester } from './TopologyTester';

describe('Topology', () => {

	it('Fully-connected - 2 peers', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b');

		await tester.consolidate();

		expect(tester.nodes('a')).toEqual([ 'b' ]);
		expect(tester.nodes('b')).toEqual([ 'a' ]);

		await tester.shutdown();
	});

	it('Fully-connected - 3 peers', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('a', 'c')
			.bidirectional('b', 'c');

		await tester.consolidate();

		expect(tester.nodes('a')).toEqual([ 'b', 'c' ]);
		expect(tester.nodes('b')).toEqual([ 'a', 'c' ]);
		expect(tester.nodes('c')).toEqual([ 'a', 'b' ]);

		await tester.shutdown();
	});

	it('Fully-connected - 3 peers, disconnect one', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('a', 'c')
			.bidirectional('b', 'c');

		try {

			await tester.consolidate();

			expect(tester.path('a', 'b')).toEqual([ 'a' ]);
			expect(tester.path('a', 'c')).toEqual([ 'a' ]);
			expect(tester.path('b', 'a')).toEqual([ 'b' ]);
			expect(tester.path('b', 'c')).toEqual([ 'b' ]);
			expect(tester.path('c', 'a')).toEqual([ 'c' ]);
			expect(tester.path('c', 'b')).toEqual([ 'c' ]);

			tester.disconnect('a', 'c');

			await tester.consolidate();

			expect(tester.path('a', 'b')).toEqual([ 'a' ]);
			expect(tester.path('a', 'c')).toEqual([ 'a', 'b' ]);
			expect(tester.path('b', 'a')).toEqual([ 'b' ]);
			expect(tester.path('b', 'c')).toEqual([ 'b' ]);
			expect(tester.path('c', 'a')).toEqual([ 'c', 'b' ]);
			expect(tester.path('c', 'b')).toEqual([ 'c' ]);
		} finally {
			await tester.shutdown();
		}
	});

	it('Mesh - 3 peers, B as router', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('b', 'c');

		try {
			await tester.consolidate();

			expect(tester.path('a', 'b')).toEqual([ 'a' ]);
			expect(tester.path('a', 'c')).toEqual([ 'a', 'b' ]);
			expect(tester.path('b', 'a')).toEqual([ 'b' ]);
			expect(tester.path('b', 'c')).toEqual([ 'b' ]);
			expect(tester.path('c', 'a')).toEqual([ 'c', 'b' ]);
			expect(tester.path('c', 'b')).toEqual([ 'c' ]);
		} finally {
			await tester.shutdown();
		}
	});
});
