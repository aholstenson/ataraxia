import { AsyncEvent, AsyncSubscribable } from 'atvik';

import { ServiceContract, stringType } from 'ataraxia-service-contracts';
import { TestNetwork } from 'ataraxia/test';

import { Services } from '../src/Services.js';

interface TestService {
	onHello: AsyncSubscribable<this, [ string ]>;
}

const TestService = new ServiceContract<TestService>()
	.describeEvent('onHello', {
		parameters: [
			{
				name: 'message',
				type: stringType
			}
		]
	});

describe('Services: Remote Events', () => {
	it('Can receive remote event via non-proxy', async () => {
		const testNetwork = new TestNetwork();
		testNetwork.bidirectional('a', 'b');

		const a = testNetwork.network('a');
		const b = testNetwork.network('b');

		const aServices = new Services(a);
		const bServices = new Services(b);

		await aServices.join();
		await bServices.join();

		const event = new AsyncEvent<any, [ string ]>(undefined);
		aServices.register('test', TestService.implement({
			onHello: event.subscribable
		}));

		await testNetwork.consolidate();

		let receivedEvent = false;
		const helloService = bServices.get('test');
		if(helloService.available) {
			try {
				await helloService.subscribe('onHello', msg => {
					receivedEvent = msg === 'world';
				});

				await event.emit('world');

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

	it('Can receive remote event via proxy', async () => {
		const testNetwork = new TestNetwork();
		testNetwork.bidirectional('a', 'b');

		const a = testNetwork.network('a');
		const b = testNetwork.network('b');

		const aServices = new Services(a);
		const bServices = new Services(b);

		await aServices.join();
		await bServices.join();

		const event = new AsyncEvent<any, [ string ]>(undefined);
		aServices.register('test', TestService.implement({
			onHello: event.subscribable
		}));

		await testNetwork.consolidate();

		let receivedEvent = false;
		const helloService = bServices.get('test');
		if(helloService.available) {
			try {
				const proxy = helloService.as(TestService);
				await proxy.onHello(msg => {
					receivedEvent = msg === 'world';
				});

				await event.emit('world');

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
