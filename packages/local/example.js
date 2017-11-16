'use strict';

const Network = require('ataraxia');
const LocalTransport = require('.');

const net = new Network({ name: 'ataraxia-example' });
net.addTransport(new LocalTransport());
net.start();

net.on('node:available', node => {
	console.log('A new node is available:', node.id);
	node.send('hello');
});

net.on('message', msg => {
	console.log('A message was received', msg.type, 'with data', msg.payload, 'from', msg.returnPath.id);
});
