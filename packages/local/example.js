'use strict';

const Network = require('ataraxia');
const LocalTransport = require('.');

const net = new Network({ name: 'ataraxia-example' });
net.addTransport(new LocalTransport());
net.start();

net.on('node:available', node => {
	console.log('A new node is available:', node);
	node.send('hello');
});

net.on('message', msg => {
	console.log('A message was received', msg.type, 'with data', msg.data, 'from', msg.returnPath.id);
});
