const { Exchange } = require('../../packages/core');

module.exports = async function(net) {

	let counter = 0;

	const exchange = net.createExchange('counter');
	exchange.onNodeAvailable(node => {
		node.send('hello', { counter: counter })
			.catch(e => console.log('Timed out sending hello'));
	})

	await exchange.join();

	// Increment and broadcast counter to all nodes every five seconds
	setInterval(() => {
		exchange.broadcast('counter', { current: ++counter });
	}, 5000);

}
