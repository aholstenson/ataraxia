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

		const connect = () => {
			this.leader = leader(id);
			this.leader.on('leader', () => {
				// Emit an event when this node becomes the leader
				this.debug('This node is now the leader of the machine local network');
				this.events.emit('leader');
			});

			const handlePeer = sock => {
				const peer = new LocalPeer(this);
				peer.setSocket(sock);
				this.addPeer(peer);
			};

			this.leader.on('connection', handlePeer);
			this.leader.on('client', handlePeer);
			this.leader.on('error', err => {
				this.debug('Trouble connecting to machine local network;', err);

				try {
					this.leader.close();
				} catch(ex) {
					// Do nothing
				}

				if(this.started) {
					const delay = Math.floor(50 * Math.random() + 100);
					this.debug('Retrying connection in ' + delay + 'ms');
					setTimeout(connect, delay);
				}
			});
		};

		connect();
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
