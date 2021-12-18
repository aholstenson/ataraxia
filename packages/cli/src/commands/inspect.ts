import chalk from 'chalk';
import { Argv, CommandModule } from 'yargs';

import { log, logInfo } from '../log.js';
import { createNetwork } from '../utils/createNetwork.js';
import { stopNetwork } from '../utils/stopNetwork.js';

export const inspectCommand: CommandModule = {
	command: 'inspect',
	aliases: [ 'i' ],
	describe: 'Inspect the nodes of a network',
	builder(yargs: Argv) {
		return yargs
			.usage('Usage: $0 inspect')
			.option('watch', {
				boolean: true,
				description: 'Watch for changes'
			});
	},
	async handler(args: any) {
		const net = createNetwork(args);

		let timer: NodeJS.Timeout | undefined;

		function requeueQuiet() {
			if(timer) {
				clearTimeout(timer);
			}

			if(args.watch) return;

			timer = setTimeout(() => {
				logInfo('Exiting after 5 seconds of no updates, use --watch to keep listening');
				stopNetwork(net);
			}, 5000);
		}

		net.onNodeAvailable(node => {
			if(node.id === net.networkId) return;

			requeueQuiet();
			log(chalk.green(' Available '), node.id, chalk.dim(node.estimatedLatency + 'ms'));
		});

		net.onNodeUnavailable(node => {
			if(node.id === net.networkId) return;

			requeueQuiet();
			log(chalk.red(' Unavailable '), node.id);
		});

		logInfo('Joining', chalk.magenta(net.name), 'as', chalk.blue(net.networkId));

		await net.join();

		if(args.watch) return;

		requeueQuiet();

		setTimeout(() => {
			logInfo('Exiting after 60 seconds, use --watch to keep listening');
			stopNetwork(net);
		}, 60_000);
	}
};
