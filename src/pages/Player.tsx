import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../services/socket'

const Player = () => {
  const [gameCode, setGameCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const joinGame = () => {
    if (!gameCode.trim() || !playerName.trim()) {
      setError('Please enter both game code and your name')
      return
    }

    setIsJoining(true)
    setError('')
    
    console.log('🎯 Attempting to join game:', gameCode.toUpperCase(), 'as', playerName)
    
    socket.emit('player:join', { 
      code: gameCode.toUpperCase(), 
      name: playerName 
    }, (response: { ok: boolean; reason?: string }) => {
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
          style={{ display: 'block', width: '200px', margin: '0 auto 1rem' }}
          maxLength={6}
        />
        
        <input
          className="input"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ display: 'block', width: '200px', margin: '0 auto 1rem' }}
          maxLength={20}
        />
        
        {error && (
          <div style={{ color: '#ff6b6b', margin: '1rem 0', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        
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
