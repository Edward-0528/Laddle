import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../services/socket'

interface Player {
  id: string
  name: string
  score: number
}

interface Question {
  id: string
  text: string
  choices: string[]
  durationSec: number
}

interface GameData {
  index: number
  total: number
  endsAt: number
  q: Question
}

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
}

const Game = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [gameState, setGameState] = useState<'lobby' | 'question' | 'results' | 'ended'>('lobby')
  const [players, setPlayers] = useState<Player[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<GameData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    // Listen for game events
    socket.on('lobby:update', (playerList: Player[]) => {
      setPlayers(playerList)
    })

    socket.on('game:question', (data: GameData) => {
      setGameState('question')
      setCurrentQuestion(data)
      setSelectedChoice(null)
      setHasAnswered(false)
      setCorrectAnswer(null)
      setTimeLeft(data.q.durationSec)
    })

    socket.on('game:question:end', (data: { correctIndex: number }) => {
      setCorrectAnswer(data.correctIndex)
      // Don't automatically reset to lobby - let the server control the next state
      // The server will either send the next question or game:results
    })

    socket.on('game:results', (data: LeaderboardEntry[]) => {
      console.log('🏆 Received final results:', data)
      setGameState('results')
      setLeaderboard(data)
    })

    socket.on('game:ended', () => {
      setGameState('ended')
    })

    socket.on('player:answer:ack', () => {
      setHasAnswered(true)
    })

    // Check if user is host (simplified check)
    const urlParams = new URLSearchParams(window.location.search)
    setIsHost(urlParams.get('host') === 'true')

    return () => {
      socket.off('lobby:update')
      socket.off('game:question')
      socket.off('game:question:end')
      socket.off('game:results')
      socket.off('game:ended')
      socket.off('player:answer:ack')
    }
  }, [])

  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [gameState, timeLeft])

  const startGame = () => {
    socket.emit('host:start', { code })
  }

  const selectChoice = (choiceIndex: number) => {
    if (hasAnswered || timeLeft <= 0) return
    setSelectedChoice(choiceIndex)
    socket.emit('player:answer', { code, choiceIndex })
  }

  const getChoiceClass = (index: number) => {
    let className = 'choice-button'
    if (selectedChoice === index) className += ' selected'
    if (correctAnswer !== null) {
      if (index === correctAnswer) className += ' correct'
      else if (selectedChoice === index) className += ' incorrect'
    }
    return className
  }

  if (gameState === 'ended') {
    return (
      <div className="card">
        <h2>🎮 Game Ended</h2>
        <p>Thanks for playing!</p>
      </div>
    )
  }

  if (gameState === 'results') {
    return (
      <div className="card">
        <h2>🏆 Final Results</h2>
        <div className="leaderboard">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className="leaderboard-item">
              <span className="rank">#{entry.rank}</span>
              <span>{entry.name}</span>
              <span className="score">{entry.score} pts</span>
            </div>
          ))}
        </div>
        
        {/* Elegant return to home section */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          borderTop: '2px solid #e0e0e0',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#666', marginBottom: '1rem' }}>
            {isHost ? '🎉 Great quiz! Want to create another?' : '🎉 Thanks for playing!'}
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#3367d6'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#4285f4'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              🏠 Return to Home
            </button>
            
            {isHost && (
              <button 
                onClick={() => navigate('/host')}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#34a853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#2d8f47'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#34a853'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                ➕ Create New Quiz
              </button>
            )}
          </div>
          
          <p style={{ 
            marginTop: '1rem', 
            color: '#888', 
            fontSize: '14px' 
          }}>
            Thank you for using Laddle! 🎓
          </p>
        </div>
      </div>
    )
  }

  if (gameState === 'question' && currentQuestion) {
    return (
      <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="timer">{timeLeft}s</div>
        <h3>Question {currentQuestion.index + 1} of {currentQuestion.total}</h3>
        <div className="quiz-question">
          <h2>{currentQuestion.q.text}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
            {currentQuestion.q.choices.map((choice, index) => (
              <button
                key={index}
                className={getChoiceClass(index)}
                onClick={() => selectChoice(index)}
                disabled={hasAnswered || timeLeft <= 0}
              >
                {choice}
              </button>
            ))}
          </div>
          {hasAnswered && (
            <div style={{ marginTop: '1rem', color: '#4ecdc4' }}>
              ✅ Answer submitted!
            </div>
          )}
        </div>
      </div>
    )
  }

  // Lobby state
  return (
    <div className="card">
      <h2>🎯 Game Lobby</h2>
      {isHost && (
        <div style={{ 
          background: 'rgba(255, 215, 0, 0.2)', 
          padding: '1rem', 
          borderRadius: '10px', 
          marginBottom: '1rem',
          border: '2px solid rgba(255, 215, 0, 0.5)'
        }}>
          👑 <strong>You are the Host</strong>
        </div>
      )}
      <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' }}>
        Code: {code}
      </div>
      
      <div className="leaderboard">
        <h3>Players ({players.length})</h3>
        {players.length === 0 ? (
          <div style={{ padding: '2rem', opacity: 0.7, fontStyle: 'italic' }}>
            No players have joined yet. Share the game code!
          </div>
        ) : (
          players.map((player) => (
            <div key={player.id} className="leaderboard-item">
              <span>{player.name}</span>
              <span className="score">{player.score} pts</span>
            </div>
          ))
        )}
      </div>
      
      {isHost && (
        <div style={{ marginTop: '2rem' }}>
          <button 
            className="button" 
            onClick={startGame}
            disabled={players.length === 0}
            style={{ 
              fontSize: '1.2rem',
              padding: '1rem 2rem',
              background: players.length > 0 
                ? 'linear-gradient(45deg, #4ecdc4, #44a08d)' 
                : 'linear-gradient(45deg, #666, #999)'
            }}
          >
            {players.length === 0 ? '⏳ Waiting for Players...' : '🚀 Start Quiz'}
          </button>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
            {players.length === 0 
              ? 'At least 1 player must join before starting'
              : `Ready to start with ${players.length} player${players.length > 1 ? 's' : ''}!`
            }
          </div>
        </div>
      )}
      
      {!isHost && (
        <div style={{ marginTop: '2rem', opacity: 0.8 }}>
          Waiting for host to start the quiz...
        </div>
      )}
    </div>
  )
}

export default Game
