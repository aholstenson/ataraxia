import { ServiceEvent } from '../ServiceEvent';

/**
 * Extension used by `LocalServiceReflect` to keep track of the property
 * an event is extracted from.
 */
export interface LocalServiceEvent extends ServiceEvent {
	/**
	 * Property name.
	 */
	property: string;
}
