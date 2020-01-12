import { AbstractPeer, PeerMessageType, PeerMessage, DisconnectReason } from '../../src/transport';
import { generateId } from '../../src/id';
import { Authentication, AnonymousAuth, AuthProvider } from '../../src/auth';

describe('Transport: AbstractPeer', function() {

	it('Server and client can negotiate', (done) => {
		const server = new TestPeer(testNetwork());
		const client = new TestPeer(testNetwork());

		client.other = server;
		server.other = client;

		client.onConnect(() => {
			client.requestDisconnect(DisconnectReason.Manual);
			server.requestDisconnect(DisconnectReason.Manual);

			done();
		});

		client.negotiateAsClient();
		server.negotiateAsServer();
	});

});

function testNetwork(providers: AuthProvider[] = [ new AnonymousAuth() ]) {
	return {
		networkId: generateId(),
		debugNamespace: 'tests:abstract-peer',
		authentication: new Authentication({
			providers: providers
		})
	};
}

class TestPeer extends AbstractPeer {
	public other?: TestPeer;

	public requestDisconnect(reason: DisconnectReason) {
		this.handleDisconnect(reason);
	}

	public negotiateAsServer() {
		super.negotiateAsServer();
	}

	public negotiateAsClient() {
		super.negotiateAsClient();
	}

	public send<T extends PeerMessageType>(type: T, payload: PeerMessage<T>): Promise<void> {
		if(this.other) {
			this.other.receiveData(type, payload);
		}

		return Promise.resolve();
	}
}
