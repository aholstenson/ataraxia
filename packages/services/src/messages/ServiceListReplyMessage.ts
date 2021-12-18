import { ServiceDef } from '../defs/ServiceDef.js';

/**
 * Response to a request to list services.
 */
export interface ServiceListReplyMessage {
	/**
	 * Version of services represented by this response.
	 */
	readonly version: number;

	/**
	 * Services that are available.
	 */
	readonly services: ReadonlyArray<ServiceDef>;
}
