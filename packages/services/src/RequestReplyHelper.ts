

interface PendingMessage<Result> {
	resolve: (result: Result) => void;
	reject: (err?: Error) => void;

	timeout: any;
}

export interface RequestReplyHelperOptions {
	timeout?: number;
}

export class RequestReplyHelper<Result> {
	private readonly defaultTimeout: number;

	private readonly pending: Map<number, PendingMessage<Result>>;
	private idCounter: number;

	constructor(options: RequestReplyHelperOptions) {
		this.defaultTimeout = options.timeout || 30000;

		this.pending = new Map();
		this.idCounter = 0;
	}

	private releaseId(id: number) {
		const pending = this.pending.get(id);
		if(! pending) return;

		clearTimeout(pending.timeout);
		this.pending.delete(id);
	}

	public prepareRequest(): [ number, Promise<Result> ] {
		const messageId = this.idCounter++;
		const promise = new Promise<Result>((resolve, reject) => {
			this.pending.set(messageId, {
				resolve: resolve,
				reject: reject,
				timeout: setTimeout(() => this.registerError(messageId, new Error('Timed out')), this.defaultTimeout)
			});
		});

		return [ messageId, promise ];
	}

	public registerReply(id: number, result: Result) {
		const message = this.pending.get(id);
		if(! message) return;

		// Release the message and its identifier
		this.releaseId(id);

		// Resolve the pending message
		message.resolve(result);
	}

	public registerError(id: number, error?: Error) {
		const message = this.pending.get(id);
		if(! message) return;

		// Release the message and its identifier
		this.releaseId(id);

		// Resolve the pending message
		message.reject(error);
	}
}
