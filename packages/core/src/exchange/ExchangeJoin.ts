/**
 * Message sent when a node wishes to announce it is joining an exchange.
 */
export interface ExchangeJoin {
	/**
	 * Identifier of the exchange being joined.
	 */
	id: string;
}
