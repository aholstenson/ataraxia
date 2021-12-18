import { Network } from 'ataraxia';

import { logError } from '../log.js';

/**
 * Stop a network and then exit the process.
 *
 * @param net -
 *   network to stop
 */
export function stopNetwork(net: Network) {
	net.leave()
		.then(() => process.exit(0))
		.catch(err => {
			logError('Could not stop network gracefully', err.message);
			process.exit(0);
		});
}
