'use strict';

const Network = require('ataraxia');
const TCPTransport = require('.');

const net = new Network({ name: 'ataraxia-example' });
net.addTransport(new TCPTransport());

net.start();

net.on('node:available', node => {
	console.log('A new node is available:', node.id);
	node.send('hello');
});

net.on('message', msg => {
	console.log('A message was received', msg.type, 'with data', msg.payload, 'from', msg.returnPath.id);
});
