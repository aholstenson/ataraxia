import { Network } from '../Network';
import { AnonymousAuth } from '../auth';

import { peersBetween, TestPeer } from './TestPeer';
import { TestTransport } from './TestTransport';

interface NodeInfo {
	id: ArrayBuffer;

	network: Network;

	transport: TestTransport;
}

enum ConnectionType {
	None,
	Forward,
	Backward,
	Both
}

interface ConnectionInfo {
	type: ConnectionType;

	aId: string;

	aPeer: TestPeer;

	aTransport: TestTransport;

	bId: string;

	bPeer: TestPeer;

	bTransport: TestTransport;
}

export class TestNetwork {
	private nodeInfo: Map<string, NodeInfo>;
	private connectionInfo: Map<string, ConnectionInfo>;

	constructor() {
		this.nodeInfo = new Map();
		this.connectionInfo = new Map();
	}

	/**
	 * Get node information, including its generated id and topology.
	 *
	 * @param id
	 */
	private getNode(id: string) {
		let info = this.nodeInfo.get(id);
		if(! info) {
			const transport = new TestTransport();
			const network = new Network({
				name: 'tests',
				authentication: [ new AnonymousAuth() ]
			});
			network.addTransport(transport);
			network.start();

			info = {
				id: network.networkIdBinary,
				network: network,
				transport: transport
			};

			this.nodeInfo.set(id, info);
		}

		return info;
	}

	private getConnection(a: string, b: string) {
		if(a > b) {
			const temp = a;
			a = b;
			b = temp;
		}

		const aInfo = this.getNode(a);
		const bInfo = this.getNode(b);

		const key = a + '-' + b;

		let info = this.connectionInfo.get(key);
		if(! info) {
			const [ aPeer, bPeer ] = peersBetween(aInfo.id, bInfo.id);
			info = {
				type: ConnectionType.Both,
				aId: a,
				aPeer: aPeer,
				aTransport: aInfo.transport,
				bId: b,
				bPeer: bPeer,
				bTransport: bInfo.transport
			};

			info.aTransport.addPeer(info.aPeer);
			info.bTransport.addPeer(info.bPeer);

			this.connectionInfo.set(key, info);
		}

		return info;
	}

	public changeConnection(a: string, b: string, type: ConnectionType): this {
		const info = this.getConnection(a, b);
		if(info.type === type) return this;

		if(type === ConnectionType.Both) {
			// Make sure the peers are connected both ways
			switch(info.type) {
				case ConnectionType.None:
					// No connection at all, connect both peers
					info.aPeer.connect();
					info.bPeer.connect();
					info.aTransport.addPeer(info.aPeer);
					info.bTransport.addPeer(info.bPeer);
					break;
				case ConnectionType.Forward:
					// A is connected to B, but B is not connected to A
					info.bPeer.connect();
					info.bTransport.addPeer(info.bPeer);
					break;
				case ConnectionType.Backward:
					// B is connected to A, but A is not connected to B
					info.aPeer.connect();
					info.aTransport.addPeer(info.aPeer);
					break;
			}
		} else if(type === ConnectionType.None) {
			// Disconnect both peers
			info.aPeer.disconnect();
			info.bPeer.disconnect();
		} else {
			if(info.aId !== a) {
				// Switch the direction if the peers are switched
				type = type === ConnectionType.Forward ? ConnectionType.Backward : ConnectionType.Forward;
			}

			if(type === ConnectionType.Forward) {
				switch(info.type) {
					case ConnectionType.Both:
						info.bPeer.disconnect();
						break;
					case ConnectionType.None:
						info.aPeer.connect();
						info.aTransport.addPeer(info.aPeer);
						break;
					case ConnectionType.Backward:
						info.bPeer.disconnect();
						info.aPeer.connect();
						info.aTransport.addPeer(info.aPeer);
						break;
				}
			} else {
				switch(info.type) {
					case ConnectionType.Both:
						info.aPeer.disconnect();
						break;
					case ConnectionType.None:
						info.bPeer.connect();
						info.bTransport.addPeer(info.bPeer);
						break;
					case ConnectionType.Forward:
						info.aPeer.disconnect();
						info.bPeer.connect();
						info.aTransport.addPeer(info.aPeer);
						break;
				}
			}
		}

		// Update the new connection type
		info.type = type;

		return this;
	}

	public consolidate(): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, 200));
	}

	public bidirectional(a: string, b: string): this {
		return this.changeConnection(a, b, ConnectionType.Both);
	}

	public forward(a: string, b: string): this {
		return this.changeConnection(a, b, ConnectionType.Forward);
	}

	public disconnect(a: string, b: string): this {
		return this.changeConnection(a, b, ConnectionType.None);
	}

	/**
	 * Get the network associated with the specified node.
	 *
	 * @param id
	 */
	public network(id: string): Network {
		const info = this.getNode(id);
		return info.network;
	}

	public async shutdown(): Promise<void> {
		for(const [ key, info ] of this.connectionInfo) {
			info.aPeer.disconnect();
			info.bPeer.disconnect();
		}

		for(const node of this.nodeInfo.values()) {
			await node.network.stop();
		}

		await this.consolidate();
	}
}
