import { io, Socket } from 'socket.io-client'

const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
export const socket: Socket = io(url, {
  autoConnect: true,
})

// Add connection debugging
socket.on('connect', () => {
  console.log('🔗 Connected to server:', socket.id)
})

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server')
})

socket.on('connect_error', (error) => {
  console.error('🚨 Connection error:', error)
})
