#!/usr/bin/env node

import yargs from 'yargs';

yargs
	.usage('Usage: $0 <command> [options]')
	.commandDir('./commands')
	.demandCommand(1, 'Missing command, use --help for usage information')
	.option('network', {
		description: 'Join named TCP network and machine-local network',
		string: true
	})
	.options('hyperswarm', {
		description: 'Add Hyperswarm transport with the given topic',
		string: true
	})
	.option('sharedKey', {
		description: 'Shared key to authenticate peers with',
		string: true
	})
	.argv;
