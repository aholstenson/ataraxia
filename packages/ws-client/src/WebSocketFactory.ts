import { WebSocket } from './WebSocket.js';

export type WebSocketFactory = (url: string) => WebSocket;
