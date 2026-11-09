// ---------------------------------------------------------------------------
// Socket.IO Client Service
// Manages the WebSocket connection to the Ladle game server. Includes
// automatic reconnection handling and structured connection state logging.
// ---------------------------------------------------------------------------

import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  // Keep trying for as long as the page is open: a phone coming back from
  // sleep or a server restart should reconnect on its own.
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
})

// Connection lifecycle logging (no special characters)
socket.on('connect', () => {
  console.log('[Ladle] Connected to server - socket id:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('[Ladle] Disconnected from server - reason:', reason)
})

socket.on('connect_error', (error) => {
  console.error('[Ladle] Connection error:', error.message)
})

socket.io.on('reconnect_attempt', (attempt) => {
  console.log('[Ladle] Reconnection attempt', attempt)
})

socket.io.on('reconnect', (attempt) => {
  console.log('[Ladle] Reconnected after', attempt, 'attempts')
})

socket.io.on('reconnect_failed', () => {
  console.error('[Ladle] Failed to reconnect after all attempts')
})
