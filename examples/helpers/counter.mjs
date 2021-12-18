import { NamedGroup } from 'ataraxia';

export async function counter(net) {
	let counter = 0;

	const group = new NamedGroup(net, 'counter');
	group.onNodeAvailable(node => {
		node.send('hello', { counter: counter })
			.catch(e => console.log('Timed out sending hello'));
	})

	await group.join();

	// Increment and broadcast counter to all nodes every five seconds
	setInterval(() => {
		group.broadcast('counter', { current: ++counter });
	}, 5000);
}
