/**
 * Type used to identify the basic types used with {@link DataType}.
 */
export type BasicValue =
	| void
	| string
	| number
	| boolean
	| null
	| ArrayBuffer
	| BasicValue[]
	| { [ key: string ]: BasicValue };
