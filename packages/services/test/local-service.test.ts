import { Network } from 'ataraxia';
import { AsyncEvent, AsyncSubscribable, serviceContract, ServiceContract, stringType } from 'ataraxia-service-contracts';

import { ServiceHandle } from '../src/ServiceHandle.js';
import { Services } from '../src/Services.js';

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

interface EchoService {
	onEcho: AsyncSubscribable<this, [ string ]>;

	echo(message: string): Promise<string>;
}

const EchoService = new ServiceContract<EchoService>()
	.describeEvent('onEcho', {
		parameters: [
			{
				name: 'message',
				type: stringType
			}
		]
	})
	.describeMethod('echo', {
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

	it('Can listen to event', async () => {
		const services = new Services(net);

		@serviceContract(EchoService)
		class EchoServiceImpl implements EchoService {
			private echoEvent = new AsyncEvent<this, [ string ]>(this);

			public get onEcho() {
				return this.echoEvent.subscribable;
			}

			public async echo(message: string) {
				await this.echoEvent.emit(message);
				return message;
			}
		}

		services.register('test', new EchoServiceImpl());

		const service = services.get('test');
		expect(service.available).toBe(true);

		let receivedEvent = false;
		await service.subscribe('onEcho', msg => {
			receivedEvent = msg === 'echo1';
		});

		await service.call('echo', 'echo1');
		expect(receivedEvent).toBe(true);
	});

	it('Can listen to event via proxy', async () => {
		const services = new Services(net);

		@serviceContract(EchoService)
		class EchoServiceImpl implements EchoService {
			private echoEvent = new AsyncEvent<this, [ string ]>(this);

			public get onEcho() {
				return this.echoEvent.subscribable;
			}

			public async echo(message: string) {
				await this.echoEvent.emit(message);
				return message;
			}
		}

		services.register('test', new EchoServiceImpl());

		const service = services.get('test');
		expect(service.available).toBe(true);

		let receivedEvent = false;
		const proxy = service.as(EchoService);
		await proxy.onEcho(msg => {
			receivedEvent = msg === 'echo1';
		});

		await service.call('echo', 'echo1');
		expect(receivedEvent).toBe(true);
	});

	it('Can register and call multiple services with same id', async () => {
		const services = new Services(net);

		@serviceContract(TestService)
		class TestServiceImpl implements TestService {
			public async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}

		services.register('test', new TestServiceImpl());

		@serviceContract(EchoService)
		class EchoServiceImpl implements EchoService {
			private echoEvent = new AsyncEvent<this, [ string ]>(this);

			public get onEcho() {
				return this.echoEvent.subscribable;
			}

			public async echo(message: string) {
				await this.echoEvent.emit(message);
				return message;
			}
		}

		services.register('test', new EchoServiceImpl());

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');

		let receivedEvent = false;
		await service.subscribe('onEcho', msg => {
			receivedEvent = msg === 'echo1';
		});

		await service.call('echo', 'echo1');
		expect(receivedEvent).toBe(true);
	});

	it('Can register service via extended class', async () => {
		const services = new Services(net);

		@serviceContract(TestService)
		class TestService1 implements TestService {
			public async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}

		class TestServiceImpl extends TestService1 {
		}

		services.register('test', new TestServiceImpl());

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');
	});

	it('Can register service with multiple contracts', async () => {
		const services = new Services(net);

		@serviceContract(TestService)
		class TestServiceImpl implements TestService {
			public async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}

		@serviceContract(EchoService)
		class EchoServiceImpl extends TestServiceImpl implements EchoService {
			private echoEvent = new AsyncEvent<this, [ string ]>(this);

			public get onEcho() {
				return this.echoEvent.subscribable;
			}

			public async echo(message: string) {
				await this.echoEvent.emit(message);
				return message;
			}
		}

		services.register('test', new EchoServiceImpl());

		const service = services.get('test');
		expect(service.available).toBe(true);

		const s = await service.call('hello', 'world');
		expect(s).toBe('Hello world!');

		let receivedEvent = false;
		await service.subscribe('onEcho', msg => {
			receivedEvent = msg === 'echo1';
		});

		await service.call('echo', 'echo1');
		expect(receivedEvent).toBe(true);
	});

	it('onServiceAvailable triggers', async () => {
		const services = new Services(net);

		let availableCount = 0;
		services.onServiceAvailable(s => {
			availableCount++;
		});

		services.register('test', TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		expect(availableCount).toBe(1);
	});

	it('onServiceUnavailable triggers', async () => {
		const services = new Services(net);

		let unavailableCount = 0;
		services.onServiceUnavailable(s => {
			unavailableCount++;
		});

		const handle = services.register('test', TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		handle.unregister();

		expect(unavailableCount).toBe(1);
	});

	it('Service.onAvailable triggers', async () => {
		const services = new Services(net);

		const service = services.get('test');
		let availableCount = 0;
		service.onAvailable(() => {
			availableCount++;
		});

		services.register('test', TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		expect(availableCount).toBe(1);
	});

	it('Service.onUnavailable triggers', async () => {
		const services = new Services(net);

		const service = services.get('test');
		let unavailableCount = 0;
		service.onUnavailable(() => {
			unavailableCount++;
		});

		const handle = services.register('test', TestService.implement({
			async hello(what: string) {
				return 'Hello ' + what + '!';
			}
		}));

		handle.unregister();

		expect(unavailableCount).toBe(1);
	});
});
