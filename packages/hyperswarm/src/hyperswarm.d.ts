declare module 'hyperswarm' {

	import { Duplex } from 'stream';

	function hyperswarm(): Swarm;

	export default hyperswarm;

	export interface SwarmJoinOptions {
		lookup?: boolean;
		announce?: boolean;
	}

	export interface SwarmConnectionInfo {
		type: 'tcp' | 'utp';
		client: boolean;
		peer: SwarmPeer | null;
	}

	export interface SwarmPeer {
		port: number;
		host: string;
		local: boolean;
		referrer: {
			port: number;
			host: string;
			id: Buffer;
		},
		topic: Buffer
	}

	export interface Swarm {
		join(topic: Buffer, options?: SwarmJoinOptions, onJoin?: () => void): void;

		leave(topic: Buffer, onLeave?: () => void): void;

		on(event: 'connection', handler: (socket: Duplex, info: SwarmConnectionInfo) => void): void;
		on(event: 'peer', handler: (peer: SwarmPeer) => void): void;
	}
}
