import { Event } from 'atvik';

import { TestNetwork } from 'ataraxia/test';

import { Services } from '../src/Services';
import { Subscribable } from '../src/Subscribable';

interface TestService {
	onHello: Subscribable<this, [ string ]>;
}

describe('Services: Remote Events', () => {
	it('Can receive remote event', async () => {
		const testNetwork = new TestNetwork();
		testNetwork.bidirectional('a', 'b');

		const a = testNetwork.network('a');
		const b = testNetwork.network('b');

		const aServices = new Services(a);
		const bServices = new Services(b);

		await aServices.join();
		await bServices.join();

		const event = new Event<void, [ string ]>(undefined);
		aServices.register({
			id: 'test',

			onHello: event.subscribable
		});

		await testNetwork.consolidate();

		let receivedEvent = false;
		const helloService = bServices.get<TestService>('test');
		if(helloService) {
			try {
				await helloService.onHello(msg => {
					receivedEvent = msg === 'world';
				});

				event.emit('world');

				await testNetwork.consolidate();
			} finally {
				await testNetwork.shutdown();
			}
			expect(receivedEvent).toBe(true);
			return;
		}

		await testNetwork.shutdown();
		throw new Error('Service not found');
	});
});
