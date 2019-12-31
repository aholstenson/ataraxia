import { TestNetwork } from 'ataraxia/test';

import { Services } from '../src/Services';

interface TestService {
	hello(what: string): Promise<string>;
}

describe('Services: Remote Calls', () => {

	it('Can call remote service', async () => {
		const testNetwork = new TestNetwork();
		testNetwork.bidirectional('a', 'b');

		const a = testNetwork.network('a');
		const b = testNetwork.network('b');

		const aServices = new Services(a);
		const bServices = new Services(b);

		await aServices.start();
		await bServices.start();

		aServices.register({
			id: 'test',

			hello(what: string) {
				return 'Hello ' + what + '!';
			}
		});

		await testNetwork.consolidate();

		const helloService = bServices.get<TestService>('test');
		if(helloService) {
			try {
				const s = await helloService.hello('world');
				expect(s).toBe('Hello world!');
			} finally {
				await testNetwork.shutdown();
			}
			return;
		}

		await testNetwork.shutdown();
		throw new Error('Service not found');
	});
});
