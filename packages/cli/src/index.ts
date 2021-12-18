#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { inspectCommand } from './commands/inspect.js';
import { listenCommand } from './commands/listen.js';

yargs(hideBin(process.argv))
	.usage('Usage: $0 <command> [options]')
	.command(inspectCommand)
	.command(listenCommand)
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
