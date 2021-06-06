export interface WebSocket {
	binaryType: string;

	addEventListener(method: 'open', cb?: () => void): void;
	addEventListener(method: 'message', cb?: (event: { data: any }) => void): void;
	addEventListener(method: 'close', cb?: () => void): void;
	addEventListener(method: 'error', cb?: (event: { error?: any }) => void): void;

	close(code?: number, reason?: string): void;
	send(data: ArrayBuffer): void;
}
