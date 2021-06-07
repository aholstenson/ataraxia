import { AnonymousAuth } from '../../src/auth';
import { generateId } from '../../src/id';
import { AbstractPeer, PeerMessageType, PeerMessage, DisconnectReason } from '../../src/transport';
import { WithNetwork } from '../../src/WithNetwork';

describe('Transport: AbstractPeer', function() {
	it('Server and client can negotiate', done => {
		const server = new TestPeer(testNetwork(), [ AnonymousAuth.INSTANCE ]);
		const client = new TestPeer(testNetwork(), [ AnonymousAuth.INSTANCE ]);

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

/**
 * Generate a fake network instance.
 *
 * @returns -
 *   fake network
 */
function testNetwork(): WithNetwork {
	return {
		networkId: generateId(),
		debugNamespace: 'tests:abstract-peer'
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
