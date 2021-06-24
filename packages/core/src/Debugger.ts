import { Event } from 'atvik';
import debug from 'debug';

/**
 * Helper for creating a good debug experience for Ataraxia classes. Builds
 * on top of [debug](https://github.com/visionmedia/debug) but adds support
 * for emitting errors as events.
 */
export class Debugger<T extends object> {
	/**
	 * Debug instance used for logging.
	 */
	private readonly debug: debug.Debugger;

	/**
	 * Event used for errors.
	 */
	private readonly errorEvent: Event<T, [ error: Error ]>;

	/**
	 * Create a new instance.
	 *
	 * @param parent -
	 *   object to use as this for emitted error events
	 * @param namespace -
	 *   the namespace to use for the debug logging
	 */
	public constructor(parent: T, namespace: string) {
		this.debug = debug(namespace);
		this.errorEvent = new Event(parent);
	}

	/**
	 * Get if the debugger prints messages.
	 *
	 * @returns
	 *   `true` if messages are printed
	 */
	public get enabled(): boolean {
		return this.debug.enabled;
	}

	/**
	 * The current namespace.
	 *
	 * @returns
	 *   namespace used to print messages
	 */
	public get namespace(): string {
		return this.debug.namespace;
	}

	/**
	 * Event emitted when an error occurs.
	 *
	 * @returns
	 *   subscribable
	 */
	public get onError() {
		return this.errorEvent.subscribable;
	}

	/**
	 * Log something.
	 *
	 * @param formatter -
	 *   formatter
	 * @param args -
	 *   arguments
	 */
	public log(formatter: any, ...args: any[]): void {
		this.debug(formatter, ...args);
	}

	/**
	 * Log and emit an error.
	 *
	 * @param error -
	 *   error that occurred
	 * @param formatter -
	 *   formatter
	 * @param args -
	 *   arguments
	 */
	public error(error: Error, formatter: any = 'An error has occurred:', ...args: any[]) {
		this.debug(formatter, ...args, error);
		this.errorEvent.emit(error);
	}
}
