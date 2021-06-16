import { Network } from 'ataraxia';
import { serviceContract, ServiceContract, stringType } from 'ataraxia-service-contracts';

import { ServiceHandle } from '../src/ServiceHandle';
import { Services } from '../src/Services';

// Fake network used by tests, not actually started
const net = new Network({
	name: 'test'
});

interface TestService {
	hello(what: string): Promise<string>;
}

const TestService = new ServiceContract<TestService>()
	.describeMethod('hello', {
		returnType: stringType,
		parameters: [
			{
				name: 'message',
				type: stringType
			}
		]
	});

describe('Services: Local', () => {
	it('Can register and call plain object', async () => {
		const services = new Services(net);

		services.register('test', TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and call object created via factory', async () => {
		const services = new Services(net);

		services.register('test', () => TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and call decorated class instance', async () => {
		const services = new Services(net);

		@serviceContract(TestService)
		class TestServiceImpl implements TestService {
			public async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}
		services.register('test', new TestServiceImpl());

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and call class via constructor', async () => {
		const services = new Services(net);

		@serviceContract(TestService)
		class TestServiceImpl implements TestService {
			public constructor(handle: ServiceHandle) {
				expect(handle).not.toBeNull();
			}

			public async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}

		services.register('test', TestServiceImpl);

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and proxy plain object', async () => {
		const services = new Services(net);

		services.register('test', TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		const service = services.get('test');
		expect(service.available).toBe(true);

		const proxy = service.as(TestService);
		const s = await proxy.hello('world');
		expect(s).toBe('Hello world!');
	});
});
