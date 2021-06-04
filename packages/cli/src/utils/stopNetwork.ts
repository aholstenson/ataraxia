import { Network } from 'ataraxia';
import { logError } from '../log';

export function stopNetwork(net: Network) {
	net.stop()
		.then(() => process.exit(0))
		.catch(err => {
			logError('Could not stop network gracefully', err.message);
			process.exit(0);
		});
}
