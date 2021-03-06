import chalk from 'chalk';
import { Minimatch } from 'minimatch';
import { Argv } from 'yargs';

import { NamedGroup } from 'ataraxia';

import { indent, log, logInfo } from '../log';
import { createNetwork } from '../utils/createNetwork';

export const command: string = 'listen';
export const aliases: string[] = [ 'l' ];
export const desc: string = 'Listen for messages on the network';

export const builder = (yargs: Argv) =>
	yargs
		.usage('Usage: $0 listen [--filter message-type]')
		.option('type', {
			string: true,
			description: 'Optional filter to apply to message type, supports glob expressions'
		})
		.option('group', {
			string: true,
			description: 'Optional group to join'
		});

export const handler = async (args: any) => {
	const net = createNetwork(args);

	const matcher = new Minimatch(args.type ?? '*');
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
};
