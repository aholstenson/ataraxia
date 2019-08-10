import { WebSocket } from './WebSocket';

export type WebSocketFactory = (url: string) => WebSocket;
