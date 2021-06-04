/**
 * Message sent when a node no longer wishes to be part of an exchange.
 */
export interface ExchangeLeave {
	/**
	 * Exchange to leave.
	 */
	id: string;
}
