import { BasicValue } from './BasicValue.js';

/**
 * Declaration of a specific type of data, used to convert to and from this
 * type.
 */
export interface DataType<T> {
	/**
	 * The identifier of this data type.
	 */
	readonly id: string;

	/**
	 * Convert a specific value into a basic value that can be sent over the
	 * network.
	 *
	 * @param value -
	 */
	toBasic(value: T): BasicValue;

	/**
	 * Convert a basic value into the specific value.
	 *
	 * @param value -
	 */
	fromBasic(value: BasicValue): T;
}
