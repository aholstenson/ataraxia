'use strict';

const os = require('os');
const path = require('path');

const leader = require('unix-socket-leader');
const { AbstractTransport, Peer } = require('ataraxia/transport');

const eos = require('end-of-stream');

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
			this.leader = false;

			this.net = leader(id);
			this.net.on('leader', () => {
				// Emit an event when this node becomes the leader
				this.debug('This node is now the leader of the machine local network');
				this.leader = true;
				this.events.emit('leader');
			});

			const handlePeer = sock => {
				const peer = new LocalPeer(this);
				peer.setSocket(sock);
				this.addPeer(peer);
			};

			this.net.on('connection', handlePeer);
			this.net.on('client', sock => {
				if(this.leader) {
					eos(sock, err => {
						if(err) {
							this.debug('Closed with error;', err);
						}
					});
				} else {
					handlePeer(sock);
				}
			});
			this.net.on('error', err => {
				this.debug('Trouble connecting to machine local network;', err);

				try {
					this.net.close();
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
		this.net.close();

		super.stop();
	}
};


class LocalPeer extends Peer {
	disconnect() {
		// Disconnect does nothing for local transport
		this.handleDisconnect();
	}
}
