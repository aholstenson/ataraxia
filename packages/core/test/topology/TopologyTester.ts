/* eslint-disable no-param-reassign */
import { decodeId, encodeId } from 'ataraxia-transport';

import { peersBetween, TestPeer } from '../../src/test';
import { Topology } from '../../src/topology';

interface NodeInfo {
	id: ArrayBuffer;

	topology: Topology;
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

	aTopology: Topology;

	bId: string;

	bPeer: TestPeer;

	bTopology: Topology;
}

export class TopologyTester {
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
	 *   information about node
	 */
	private getNode(id: string) {
		let info = this.nodeInfo.get(id);
		if(! info) {
			const generatedId = decodeId(id);
			info = {
				id: generatedId,

				topology: new Topology({
					networkIdBinary: generatedId,
					name: id
				}, {})
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
				aTopology: aInfo.topology,
				bId: b,
				bPeer: bPeer,
				bTopology: bInfo.topology
			};

			aPeer.connect();
			bPeer.connect();

			info.aTopology.addPeer(info.aPeer);
			info.bTopology.addPeer(info.bPeer);

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
					info.aTopology.addPeer(info.aPeer);
					info.bTopology.addPeer(info.bPeer);
					break;
				case ConnectionType.Forward:
					// A is connected to B, but B is not connected to A
					info.bPeer.connect();
					info.bTopology.addPeer(info.bPeer);
					break;
				case ConnectionType.Backward:
					// B is connected to A, but A is not connected to B
					info.aPeer.connect();
					info.aTopology.addPeer(info.aPeer);
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
						info.aTopology.addPeer(info.aPeer);
						break;
					case ConnectionType.Backward:
						info.bPeer.disconnect();
						info.aPeer.connect();
						info.aTopology.addPeer(info.aPeer);
						break;
				}
			} else {
				switch(info.type) {
					case ConnectionType.Both:
						info.aPeer.disconnect();
						break;
					case ConnectionType.None:
						info.bPeer.connect();
						info.bTopology.addPeer(info.bPeer);
						break;
					case ConnectionType.Forward:
						info.aPeer.disconnect();
						info.bPeer.connect();
						info.aTopology.addPeer(info.aPeer);
						break;
				}
			}
		}

		// Update the new connection type
		info.type = type;

		return this;
	}

	public async consolidate(): Promise<void> {
		let didActions = true;
		while(didActions) {
			didActions = false;

			for(const nodeInfo of this.nodeInfo.values()) {
				if(nodeInfo.topology.pendingActions) {
					await nodeInfo.topology.consolidate();

					didActions = true;
				}
			}

			if(didActions) {
				await new Promise(resolve => setTimeout(resolve, 10));
			}
		}
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
	 * Get the nodes that the specified node can reach, indirectly or directly.
	 *
	 * @param id -
	 * @returns
	 *   nodes that can be reached
	 */
	public nodes(id: string): ReadonlyArray<string> {
		const info = this.getNode(id);

		info.topology.refreshRouting();

		const result: string[] = [];
		for(const node of info.topology.nodelist) {
			if(node.peer) {
				result.push(encodeId(node.id));
			}
		}

		result.sort();

		return result;
	}

	/**
	 * Get the path between two nodes, excluding the start and end node.
	 *
	 * @param a -
	 * @param b -
	 * @returns
	 *   path from a to b
	 */
	public path(a: string, b: string): ReadonlyArray<string> {
		const info = this.getNode(a);
		info.topology.refreshRouting();

		const node = info.topology.getOrCreate(decodeId(b));
		return node.toPath().map(n => encodeId(n.id));
	}

	public async shutdown(): Promise<void> {
		for(const info of this.connectionInfo.values()) {
			info.aPeer.disconnect();
			info.bPeer.disconnect();
		}

		await this.consolidate();
	}
}
