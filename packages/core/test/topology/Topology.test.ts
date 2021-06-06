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

		expect(tester.path('a', 'b')).toEqual([ 'a' ]);
		expect(tester.path('a', 'c')).toEqual([ 'a' ]);
		expect(tester.path('b', 'a')).toEqual([ 'b' ]);
		expect(tester.path('b', 'c')).toEqual([ 'b' ]);
		expect(tester.path('c', 'a')).toEqual([ 'c' ]);
		expect(tester.path('c', 'b')).toEqual([ 'c' ]);

		await tester.shutdown();
	});

	it('Fully-connected - 3 peers, disconnect one', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('a', 'c')
			.bidirectional('b', 'c');

		try {
			await tester.consolidate();

			expect(tester.nodes('a')).toEqual([ 'b', 'c' ]);
			expect(tester.nodes('b')).toEqual([ 'a', 'c' ]);
			expect(tester.nodes('c')).toEqual([ 'a', 'b' ]);

			expect(tester.path('a', 'b')).toEqual([ 'a' ]);
			expect(tester.path('a', 'c')).toEqual([ 'a' ]);
			expect(tester.path('b', 'a')).toEqual([ 'b' ]);
			expect(tester.path('b', 'c')).toEqual([ 'b' ]);
			expect(tester.path('c', 'a')).toEqual([ 'c' ]);
			expect(tester.path('c', 'b')).toEqual([ 'c' ]);

			tester.disconnect('a', 'c');

			await tester.consolidate();

			expect(tester.nodes('a')).toEqual([ 'b', 'c' ]);
			expect(tester.nodes('b')).toEqual([ 'a', 'c' ]);
			expect(tester.nodes('c')).toEqual([ 'a', 'b' ]);

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

	it('Fully-connected - 4 peers, disconnect one', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('a', 'c')
			.bidirectional('a', 'd')
			.bidirectional('b', 'c')
			.bidirectional('b', 'd')
			.bidirectional('c', 'd');

		try {
			await tester.consolidate();

			expect(tester.nodes('a')).toEqual([ 'b', 'c', 'd' ]);
			expect(tester.nodes('b')).toEqual([ 'a', 'c', 'd' ]);
			expect(tester.nodes('c')).toEqual([ 'a', 'b', 'd' ]);

			expect(tester.path('a', 'b')).toEqual([ 'a' ]);
			expect(tester.path('a', 'c')).toEqual([ 'a' ]);
			expect(tester.path('b', 'a')).toEqual([ 'b' ]);
			expect(tester.path('b', 'c')).toEqual([ 'b' ]);
			expect(tester.path('c', 'a')).toEqual([ 'c' ]);
			expect(tester.path('c', 'b')).toEqual([ 'c' ]);

			tester.disconnect('a', 'd');
			tester.disconnect('b', 'd');
			tester.disconnect('c', 'd');

			await tester.consolidate();

			expect(tester.nodes('a')).toEqual([ 'b', 'c' ]);
			expect(tester.nodes('b')).toEqual([ 'a', 'c' ]);
			expect(tester.nodes('c')).toEqual([ 'a', 'b' ]);
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

			expect(tester.nodes('a')).toEqual([ 'b', 'c' ]);
			expect(tester.nodes('b')).toEqual([ 'a', 'c' ]);

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

	it('Mesh - 5 peers', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('a', 'c')
			.bidirectional('b', 'd')
			.bidirectional('b', 'e');

		try {
			await tester.consolidate();

			expect(tester.path('a', 'b')).toEqual([ 'a' ]);
			expect(tester.path('a', 'c')).toEqual([ 'a' ]);
			expect(tester.path('a', 'd')).toEqual([ 'a', 'b' ]);
			expect(tester.path('a', 'e')).toEqual([ 'a', 'b' ]);

			expect(tester.path('b', 'a')).toEqual([ 'b' ]);
			expect(tester.path('b', 'c')).toEqual([ 'b', 'a' ]);
			expect(tester.path('b', 'd')).toEqual([ 'b' ]);
			expect(tester.path('b', 'e')).toEqual([ 'b' ]);

			expect(tester.path('c', 'a')).toEqual([ 'c' ]);
			expect(tester.path('c', 'b')).toEqual([ 'c', 'a' ]);
			expect(tester.path('c', 'd')).toEqual([ 'c', 'a', 'b' ]);

			expect(tester.path('d', 'a')).toEqual([ 'd', 'b' ]);
			expect(tester.path('d', 'b')).toEqual([ 'd' ]);
		} finally {
			await tester.shutdown();
		}
	});

	it('Mesh - 5 peers, disconnect', async () => {
		const tester = new TopologyTester()
			.bidirectional('a', 'b')
			.bidirectional('a', 'c')
			.bidirectional('b', 'd')
			.bidirectional('b', 'e');

		try {
			await tester.consolidate();

			tester.disconnect('a', 'c');

			await tester.consolidate();

			expect(tester.nodes('a')).toEqual([ 'b', 'd', 'e' ]);
			expect(tester.nodes('b')).toEqual([ 'a', 'd', 'e' ]);
			expect(tester.nodes('c')).toEqual([]);
			expect(tester.nodes('d')).toEqual([ 'a', 'b', 'e' ]);
			expect(tester.nodes('e')).toEqual([ 'a', 'b', 'd' ]);
		} finally {
			await tester.shutdown();
		}
	});
});
