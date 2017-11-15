'use strict';

const os = require('os');
const path = require('path');

const leader = require('unix-socket-leader');
const { AbstractTransport, Peer } = require('ataraxia/transport');

/**
 * Machine local transport. Uses Unix sockets to connect to peers on the
 * same machine.
 */
module.exports = class MachineLocal extends AbstractTransport {
	constructor() {
		super('local');
	}

	start(options) {
		super.start(options);

		const id = path.join(os.tmpdir(), options.name + '');
		this.leader = leader(id);
		this.leader.on('leader', () => {
			// Emit an event when this node becomes the leader
			this.events.emit('leader');
		});

		const handlePeer = sock => {
			const peer = new LocalPeer(this);
			peer.setSocket(sock);
			this.addPeer(peer);
		};

		this.leader.on('connection', handlePeer);
		this.leader.on('client', handlePeer);
	}

	stop() {
		this.leader.close();

		super.stop();
	}
};


class LocalPeer extends Peer {
	disconnect() {
		// Disconnect does nothing for local transport
	}
}
