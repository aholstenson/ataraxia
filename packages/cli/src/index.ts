#!/usr/bin/env node

import yargs from 'yargs';

const argv = yargs
	.usage('Usage: $0 <command> [options]')
	.commandDir('./commands')
	.demandCommand(1, 'Missing command, use --help for usage information')
	.option('network', {
		description: 'Name of the network to work with',
		string: true,
		demandOption: 'Network name must be present'
	})
	.option('sharedKey', {
		description: 'Shared key to authenticate peers with',
		string: true
	})
	.options('hyperswarm', {
		description: 'Add Hyperswarm transport with the given topic',
		string: true
	})
	.argv;
