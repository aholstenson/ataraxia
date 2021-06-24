/* eslint-disable no-param-reassign */
import { Network } from '../Network';

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

/**
 * Network intended for test usage. Helps with creating a network and modifying
 * connections to test code that uses the network.
 */
export class TestNetwork {
	private nodeInfo: Map<string, NodeInfo>;
	private connectionInfo: Map<string, ConnectionInfo>;

	public constructor() {
		this.nodeInfo = new Map();
		this.connectionInfo = new Map();
	}

	/**
	 * Get node information, including its generated id and topology.
	 *
	 * @param id -
	 * @returns
	 *   info associated with the node
	 */
	private getNode(id: string) {
		let info = this.nodeInfo.get(id);
		if(! info) {
			const transport = new TestTransport();
			const network = new Network({
				name: 'tests:' + id
			});
			network.addTransport(transport);
			network.join()
				.catch(() => { /* test will fail if network isn't joined */ });

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
				type: ConnectionType.None,
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

	/**
	 * Modify how nodes A and B connect to each other.
	 *
	 * @param a -
	 *   first node
	 * @param b -
	 *   second node
	 * @param type -
	 *   type of connection to have
	 * @returns
	 *   self
	 */
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
					break;
				case ConnectionType.Forward:
					// A is connected to B, but B is not connected to A
					info.bPeer.connect();
					break;
				case ConnectionType.Backward:
					// B is connected to A, but A is not connected to B
					info.aPeer.connect();
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
						break;
					case ConnectionType.Backward:
						info.bPeer.disconnect();
						info.aPeer.connect();
						break;
				}
			} else {
				switch(info.type) {
					case ConnectionType.Both:
						info.aPeer.disconnect();
						break;
					case ConnectionType.None:
						info.bPeer.connect();
						break;
					case ConnectionType.Forward:
						info.aPeer.disconnect();
						info.bPeer.connect();
						break;
				}
			}
		}

		// Update the new connection type
		info.type = type;

		return this;
	}

	/**
	 * Consolidate the network. This will wait for changes to applied before
	 * resolving.
	 *
	 * @returns
	 *   promise that resolves when changes to the networks have been fully
	 *   applied
	 */
	public consolidate(): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, 200));
	}

	/**
	 * Create a bidirectional connection between two nodes.
	 *
	 * @param a -
	 *   first node
	 * @param b -
	 *   second node
	 * @returns
	 *   self
	 */
	public bidirectional(a: string, b: string): this {
		return this.changeConnection(a, b, ConnectionType.Both);
	}

	/**
	 * Create a connection from node `a` to node `b` but not from `b` to `a`.
	 *
	 * @param a -
	 *   first node
	 * @param b -
	 *   second node
	 * @returns
	 *   self
	 */
	public forward(a: string, b: string): this {
		return this.changeConnection(a, b, ConnectionType.Forward);
	}

	/**
	 * Disconnect the connection between two nodes.
	 *
	 * @param a -
	 *   first node
	 * @param b -
	 *   second node
	 * @returns
	 *   self
	 */
	public disconnect(a: string, b: string): this {
		return this.changeConnection(a, b, ConnectionType.None);
	}

	/**
	 * Get the network associated with the specified node.
	 *
	 * @param id -
	 *   identifier of node
	 * @returns
	 *   network instance
	 */
	public network(id: string): Network {
		const info = this.getNode(id);
		return info.network;
	}

	/**
	 * Shutdown all the nodes and their networks.
	 */
	public async shutdown(): Promise<void> {
		for(const info of this.connectionInfo.values()) {
			info.aPeer.disconnect();
			info.bPeer.disconnect();
		}

		for(const node of this.nodeInfo.values()) {
			await node.network.leave();
		}

		await this.consolidate();
	}
}
