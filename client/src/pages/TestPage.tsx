import { useState, useEffect } from 'react'
import { socket } from '../services/socket'

const TestPage = () => {
  const [connected, setConnected] = useState(false)
  const [testGame, setTestGame] = useState('')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true)
      setTestMessage('✅ Connected to server')
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setTestMessage('❌ Disconnected from server')
    })

    socket.on('connect_error', (error) => {
      setTestMessage(`🚨 Connection error: ${error.message}`)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
    }
  }, [])

  const testCreateGame = () => {
    const testQuestions = [{
      id: 'test1',
      text: 'What is 2+2?',
      choices: ['3', '4', '5', '6'],
      answerIndex: 1,
      durationSec: 20
    }]

    socket.emit('host:create', { questions: testQuestions }, (response: { code: string }) => {
      setTestGame(response.code)
      setTestMessage(`🎯 Game created with code: ${response.code}`)
    })
  }

  const testJoinGame = () => {
    if (!testGame) {
      setTestMessage('❌ No game to join. Create a game first.')
      return
    }

    socket.emit('player:join', { 
      code: testGame, 
      name: 'TestPlayer' 
    }, (response: { ok: boolean; reason?: string }) => {
      if (response.ok) {
        setTestMessage('✅ Successfully joined game!')
      } else {
        setTestMessage(`❌ Failed to join: ${response.reason}`)
      }
    })
  }

  return (
    <div className="card">
      <h2>🧪 Connection Test</h2>
      <div style={{ marginBottom: '1rem' }}>
        <strong>Status:</strong> {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
        {testMessage || 'Waiting for connection...'}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="button" onClick={testCreateGame} disabled={!connected}>
          🎯 Create Test Game
        </button>
        
        <button className="button" onClick={testJoinGame} disabled={!connected || !testGame}>
          🙋‍♂️ Join Test Game
        </button>
      </div>

      {testGame && (
        <div style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
          Game Code: <strong>{testGame}</strong>
        </div>
      )}
    </div>
  )
}

export default TestPage
