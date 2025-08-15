import { io, Socket } from 'socket.io-client';

const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
export const socket: Socket = io(url, {
  autoConnect: true,
});
