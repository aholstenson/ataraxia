import { Group } from './Group';
import { Node } from './Node';

export interface GossiperOptions<V extends object> {
	/**
	 * The interval to gossip with.
	 */
	intervalInMs: number;

	gossip: (node: Node<V>) => void;
}

export class Gossiper<V extends object> {
	private readonly group: Group<V>;
	private readonly timer: any;

	private readonly gossip: (node: Node<V>) => void;

	public constructor(group: Group<V>, options: GossiperOptions<V>) {
		this.group = group;
		this.timer = setInterval(this.findAndGossip.bind(this), options.intervalInMs);
		this.gossip = options.gossip;
	}

	public destroy(): void {
		clearInterval(this.timer);
	}

	private findAndGossip() {
		const nodes = this.group.nodes;
		const idx = Math.floor(Math.random() * nodes.length);

		const node = nodes[idx];
		this.gossip(node);
	}
}
