/**
 * Type for picking out the data type of a message.
 */
export type MessageData<MessageTypes extends object, T extends keyof MessageTypes> = MessageTypes[T];
