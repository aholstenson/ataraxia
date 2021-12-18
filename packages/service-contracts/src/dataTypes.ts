import { DataType } from './DataType.js';

/**
 * Type that represents no value.
 */
export const voidType: DataType<void> = {
	id: 'void',

	fromBasic() {
		return undefined;
	},

	toBasic() {
		return undefined;
	}
};

/**
 * Type that represents a string value.
 */
export const stringType: DataType<string> = {
	id: 'string',

	fromBasic(value) {
		if(typeof value === 'string') {
			return value;
		}

		throw new Error('Conversion failed, expected a string but got ' + value);
	},

	toBasic(value) {
		return value;
	}
};

/**
 * Type that represents a number.
 */
export const numberType: DataType<number> = {
	id: 'number',

	fromBasic(value) {
		if(typeof value === 'number') {
			return value;
		}

		throw new Error('Conversion failed, expected a number but got ' + value);
	},

	toBasic(value) {
		return value;
	}
};

/**
 * Type that represents a boolean.
 */
export const booleanType: DataType<boolean> = {
	id: 'boolean',

	fromBasic(value) {
		if(typeof value === 'boolean') {
			return value;
		}

		throw new Error('Conversion failed, expected a boolean but got ' + value);
	},

	toBasic(value) {
		return value;
	}
};

/**
 * Create a type that represents an array of another type.
 *
 * @typeParam T -
 *   type of item
 * @param itemType -
 *   the data type for items in the array
 * @returns
 *   data type for array of the specified type
 */
export function arrayType<T extends DataType<T>>(itemType: DataType<T>): DataType<T[]> {
	return {
		id: 'array<' + itemType.id + '>',

		fromBasic(value) {
			if(Array.isArray(value)) {
				return value.map(v => itemType.fromBasic(v));
			}

			throw new Error('Conversion failed, expected an array but got ' + value);
		},

		toBasic(value) {
			return value.map(v => itemType.toBasic(v));
		}
	};
}
