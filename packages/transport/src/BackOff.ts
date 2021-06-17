/**
 * Options for `BackOff`.
 */
export interface BackOffOptions {
	/**
	 * The delay to apply.
	 */
	readonly delay: number;

	/**
	 * The maximum delay.
	 */
	readonly maxDelay: number;

	/**
	 * The maximum jitter to apply.
	 */
	readonly maxJitter?: number;
}

/**
 * BackOff implementation to help delaying actions such as resending data or
 * reconnecting to a peer. This implementation will double the delay and apply
 * an optional jitter
 */
export class BackOff {
	private readonly maxDelay: number;
	private readonly initialDelay: number;
	private readonly maxJitter: number;

	private attempt: number;
	private _nextDelay: number;

	public constructor(options: BackOffOptions) {
		this.attempt = 0;
		this._nextDelay = 0;

		this.initialDelay = options.delay;
		this.maxDelay = options.maxDelay;
		this.maxJitter = options.maxJitter ?? 100;
	}

	/**
	 * Reset the attempt.
	 */
	public reset() {
		this.attempt = 0;
	}

	/**
	 * Get the delay for the next attempt.
	 *
	 * @returns
	 *   number of milliseconds to wait
	 */
	public nextDelay() {
		const attempt = this.attempt++;
		const result = this._nextDelay + Math.floor(this.maxJitter * Math.random());

		if(attempt === 0) {
			this._nextDelay = this.initialDelay;
		} else {
			this._nextDelay *= 2;

			if(this._nextDelay >= this.maxDelay) {
				this._nextDelay = this.maxDelay;
			}
		}

		return result;
	}

	/**
	 * Get the next delay as a promise. The promise will resolve when delay
	 * is reached.
	 *
	 * @returns
	 *   promise that resolves when the next delay is reached
	 */
	public asPromise(): Promise<void> {
		const delay = this.nextDelay();
		return new Promise(resolve => setTimeout(resolve, delay));
	}
}
