
export interface ServiceInvokeRequest {
	readonly id: number;

	readonly service: string;
	readonly method: string;
	readonly arguments: ReadonlyArray<any>;
}
