/**
 * Type for defining the type of message.
 */
export type MessageType<MessageTypes extends object> = keyof MessageTypes & string;
