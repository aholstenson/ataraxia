import chalk from 'chalk';
import m from 'minimatch';
import { Argv, CommandModule } from 'yargs';

import { NamedGroup } from 'ataraxia';

import { indent, log, logInfo } from '../log.js';
import { createNetwork } from '../utils/createNetwork.js';

export const listenCommand: CommandModule = {
	command: 'listen',
	aliases: [ 'l' ],
	describe: 'Listen for messages on the network',
	builder(yargs: Argv) {
		return yargs
			.usage('Usage: $0 listen [--filter message-type]')
			.option('type', {
				string: true,
				description: 'Optional filter to apply to message type, supports glob expressions'
			})
			.option('group', {
				string: true,
				description: 'Optional group to join'
			});
	},
	async handler(args: any) {
		const net = createNetwork(args);

		const matcher = new m.Minimatch(args.type ?? '*');
		net.onMessage(message => {
			if(! matcher.match(message.type)) return;

			log(chalk.green('<-'), chalk.blue(message.source.id), message.type);
			log(indent(2, message.data));
		});

		logInfo('Joining', chalk.magenta(net.name), 'as', chalk.blue(net.networkId));

		await net.join();

		if(args.exchange) {
			await new NamedGroup(net, args.group).join();
		}
	}
};
