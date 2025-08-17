import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../services/socket'

const Player = () => {
  const [gameCode, setGameCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const testConnection = () => {
    console.log('🧪 Testing server connection from mobile...')
    console.log('📱 User agent:', navigator.userAgent)
    console.log('🔌 Socket connected:', socket.connected)
    
    socket.emit('test:ping', (response: any) => {
      console.log('🏓 Test response:', response)
      if (response && response.success) {
        alert(`✅ Connection successful! Server: ${response.message}`)
      } else {
        alert('❌ Connection test failed. Check your internet connection.')
      }
    })
  }

  const joinGame = () => {
    if (!gameCode.trim() || !playerName.trim()) {
      setError('Please enter both game code and your name')
      return
    }

    setIsJoining(true)
    setError('')
    
    console.log('🎯 Attempting to join game:', gameCode.toUpperCase(), 'as', playerName)
    console.log('📱 User agent:', navigator.userAgent)
    console.log('🔌 Socket connected:', socket.connected)
    console.log('🆔 Socket ID:', socket.id)
    
    // Add timeout for mobile networks that might be slower
    const timeout = setTimeout(() => {
      console.error('⏱️ Join request timed out')
      setIsJoining(false)
      setError('Connection timeout. Please check your internet connection and try again.')
    }, 15000) // 15 second timeout for mobile
    
    socket.emit('player:join', { 
      code: gameCode.toUpperCase(), 
      name: playerName 
    }, (response: { ok: boolean; reason?: string }) => {
      clearTimeout(timeout)
      console.log('📨 Join response:', response)
      setIsJoining(false)
      if (response.ok) {
        console.log('✅ Successfully joined, navigating to game')
        navigate(`/game/${gameCode.toUpperCase()}`)
      } else {
        console.error('❌ Failed to join:', response.reason)
        setError(response.reason || 'Failed to join game')
      }
    })
    
    // Check connection status and try to reconnect if needed
    if (!socket.connected) {
      console.log('🔌 Socket not connected, attempting to connect...')
      socket.connect()
    }
  }

  return (
    <div className="card">
      <h2>🙋‍♂️ Join a Quiz</h2>
      <p>Enter the game code provided by your host</p>
      
      <div style={{ margin: '2rem 0' }}>
        <input
          className="input"
          placeholder="Game Code (e.g., ABC123)"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value.toUpperCase())}
          style={{ 
            display: 'block', 
            width: '100%', 
            maxWidth: '300px', 
            margin: '0 auto 1rem',
            fontSize: '18px', // Larger font for mobile
            padding: '12px', // Better touch target
            textAlign: 'center'
          }}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
        />
        
        <input
          className="input"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ 
            display: 'block', 
            width: '100%', 
            maxWidth: '300px', 
            margin: '0 auto 1rem',
            fontSize: '18px', // Larger font for mobile
            padding: '12px', // Better touch target
            textAlign: 'center'
          }}
          maxLength={20}
          autoComplete="name"
        />
        
        {error && (
          <div style={{ color: '#ff6b6b', margin: '1rem 0', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        
        <button 
          className="button" 
          onClick={testConnection}
          style={{ backgroundColor: '#34a853', marginBottom: '1rem' }}
        >
          🧪 Test Connection
        </button>
        
        <button 
          className="button" 
          onClick={joinGame}
          disabled={isJoining || !gameCode.trim() || !playerName.trim()}
        >
          {isJoining ? '⏳ Joining...' : '🚀 Join Game'}
        </button>
      </div>
      
      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
        Ask your host for the 6-character game code
      </div>
    </div>
  )
}

export default Player
