/**
 * Information stored for every pending request.
 */
interface PendingMessage<Result> {
	/**
	 * Function used to resolve the promise.
	 */
	resolve: (result: Result) => void;

	/**
	 * Function used to reject the promise.
	 */
	reject: (err?: Error) => void;

	/**
	 * Timeout handle.
	 */
	timeout: any;
}

/**
 * Options available for `RequestReplyHelper`.
 */
export interface RequestReplyHelperOptions {
	/**
	 * Timeout in millisecond to use for promises, after this time is reached
	 * the promise for a request will automatically be rejected.
	 *
	 * If this property is not set it will default to 30000 ms (30 seconds).
	 */
	timeout?: number;
}

/**
 * Options that can be used when preparing a request.
 */
export interface PrepareRequestOptions {
	/**
	 * The number of milliseconds to wait before this request is considered
	 * to have timed out.
	 */
	timeout?: number;
}

/**
 * Helper for managing requests and replies that are identified via a
 * number.
 *
 * ```javascript
 * const helper = new RequestReplyHelper({
 *   timeout: 30000
 * });
 *
 * // Generate an id and get a promise for the request and pass the id somewhere
 * const [ id, promise ] = helper.prepareRequest();
 *
 * // Later on register a reply
 * helper.registerReply(id, replyDataHere);
 *
 * // Or an error if something goes wrong
 * helper.registerError(id, new Error('Things went wrong'));
 * ```
 */
export class RequestReplyHelper<Result> {
	private readonly defaultTimeout: number;

	private readonly pending: Map<number, PendingMessage<Result>>;
	private idCounter: number;

	public constructor(options?: RequestReplyHelperOptions) {
		this.defaultTimeout = options?.timeout ?? 30000;

		this.pending = new Map();
		this.idCounter = 0;
	}

	/**
	 * Release an identifier.
	 *
	 * @param id -
	 */
	private releaseId(id: number) {
		const pending = this.pending.get(id);
		if(! pending) return;

		clearTimeout(pending.timeout);
		this.pending.delete(id);
	}

	/**
	 * Prepare a request, will return the identifier to use and a promise that
	 * will resolve when the reply is registered.
	 *
	 * @param options -
	 *   options for this request
	 * @returns
	 *   array with request id and promise. The promise will resolve or reject
	 *   when a result or error is registered, or when it times out
	 */
	public prepareRequest(options?: PrepareRequestOptions): [ id: number, result: Promise<Result> ] {
		const messageId = this.idCounter++;
		const timeout = options?.timeout ?? this.defaultTimeout;
		const promise = new Promise<Result>((resolve, reject) => {
			this.pending.set(messageId, {
				resolve: resolve,
				reject: reject,
				timeout: setTimeout(
					() => this.registerError(messageId, new Error('Timed out')),
					timeout
				)
			});
		});

		return [ messageId, promise ];
	}

	/**
	 * Register that a reply has been received for the given identifier. This
	 * will resolve the promise associated with the identifier.
	 *
	 * @param id -
	 *   identifier as given previously by `prepareRequest`
	 * @param result -
	 *   the result to resolve with
	 */
	public registerReply(id: number, result: Result) {
		const message = this.pending.get(id);
		if(! message) return;

		// Release the message and its identifier
		this.releaseId(id);

		// Resolve the pending message
		message.resolve(result);
	}

	/**
	 * Register that an error occurred for the given identifier. This will
	 * reject the promise associated with the identifier.
	 *
	 * @param id -
	 *   identifier as given previously by `prepareRequest`
	 * @param error -
	 *   optional error to reject with
	 */
	public registerError(id: number, error?: Error) {
		const message = this.pending.get(id);
		if(! message) return;

		// Release the message and its identifier
		this.releaseId(id);

		// Resolve the pending message
		message.reject(error);
	}
}
