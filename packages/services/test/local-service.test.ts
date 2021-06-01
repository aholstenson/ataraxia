import { Network, AnonymousAuth } from 'ataraxia';

import { Services } from '../src/Services';

// Fake network used by tests, not actually started
const net = new Network({
	name: 'test'
});

interface TestService {
	hello(what: string): Promise<string>;
}

describe('Services: Local', () => {

	it('Can register and call plain object', async () => {
		const services = new Services(net);

		services.register({
			id: 'test',

			hello(what: string) {
				return 'Hello ' + what + '!';
			}
		});

		const service = services.get<TestService>('test');
		expect(service).not.toBe(null);
		if(! service) return;

		const s = await service.hello('world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and call object created via factory', async () => {
		const services = new Services(net);

		services.register(() => ({
			id: 'test',

			hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		const service = services.get<TestService>('test');
		expect(service).not.toBe(null);
		if(! service) return;

		const s = await service.hello('world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and call class via constructor', async () => {
		const services = new Services(net);

		services.register(class {
			public id = 'test';

			public hello(what: string) {
				return 'Hello ' + what + '!';
			}
		});

		const service = services.get<TestService>('test');
		expect(service).not.toBe(null);
		if(! service) return;

		const s = await service.hello('world');
		expect(s).toBe('Hello world!');
	});

	it('Can register and call class', async () => {
		const services = new Services(net);

		services.register(new class {
			public id = 'test';

			public hello(what: string) {
				return 'Hello ' + what + '!';
			}
		});

		const service = services.get<TestService>('test');
		expect(service).not.toBe(null);
		if(! service) return;

		const s = await service.hello('world');
		expect(s).toBe('Hello world!');
	});
});
