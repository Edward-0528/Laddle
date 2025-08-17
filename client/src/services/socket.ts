import { io, Socket } from 'socket.io-client'

const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
console.log('🔌 Attempting to connect to:', url)

export const socket: Socket = io(url, {
  autoConnect: true,
  timeout: 20000, // 20 second timeout
  transports: ['websocket', 'polling'] // Try both transports
})

// Add connection debugging
socket.on('connect', () => {
  console.log('🔗 Connected to server:', socket.id)
  console.log('✅ Socket connection successful')
})

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason)
})

socket.on('connect_error', (error) => {
  console.error('🚨 Connection error:', error.message)
  console.error('🔧 URL:', url)
})

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason)
})

socket.on('connect_error', (error) => {
  console.error('🚨 Connection error:', error)
})
