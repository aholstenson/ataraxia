import chalk from 'chalk';
import prettyjson from 'prettyjson';

/**
 * Log an error message.
 *
 * @param args -
 *   arguments to format
 */
export function logError(...args: any) {
	process.stderr.write(prettify(chalk.bgRed.white(' ERROR '), ...args));
}

/**
 * Log an info message.
 *
 * @param args -
 *   arguments to format
 */
export function logInfo(...args: any) {
	process.stdout.write(prettify(chalk.bgWhite.black(' INFO '), ...args));
}

/**
 * Log a plain message.
 *
 * @param args -
 *   arguments to format
 */
export function log(...args: any) {
	process.stdout.write(prettify(...args));
}

/**
 * Indent a log message with a certain amount of space.
 *
 * @param spaces -
 *   spaces to indent with
 * @param args -
 *   arguments to format
 * @returns
 *   formatted and indented string
 */
export function indent(spaces: number, ...args: any) {
	const text = prettify(...args);
	if(spaces <= 0) return text;

	const spacing = ' '.repeat(spaces);
	return text.split('\n')
		.map(line => line.length === 0 ? line : spacing + line)
		.join('\n');
}

/**
 * Prettify a set of arguments for logging.
 *
 * @param args -
 *   arguments to format
 * @returns
 *   formatted string
 */
function prettify(...args: any) {
	let result = '';
	for(const arg of args) {
		if(result.length > 0) result += ' ';

		if(typeof arg === 'string') {
			result += arg;
		} else if(typeof arg === 'undefined') {
			result += chalk.gray('undefined');
		} else {
			result += prettyjson.render(arg);
		}
	}

	return result + '\n';
}
