import { ServiceDef } from '../defs/ServiceDef.js';

/**
 * Message sent to all nodes when a new service is available or updated.
 */
export interface ServiceAvailableMessage {
	/**
	 * The current version number for the node services.
	 */
	version: number;

	/**
	 * The definition of the service.
	 */
	def: ServiceDef;
}
