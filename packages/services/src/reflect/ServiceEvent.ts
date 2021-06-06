import { ServiceParameter } from './ServiceParameter';

/**
 * Event for a service.
 */
export interface ServiceEvent {
	/**
	 * The name of the event.
	 */
	readonly name: string;

	/**
	 * The parameters of this event.
	 */
	readonly parameters: ReadonlyArray<ServiceParameter>;
}
