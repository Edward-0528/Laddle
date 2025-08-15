import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../services/socket'

interface Question {
  id: string
  text: string
  choices: string[]
  answerIndex: number
  durationSec: number
}

const Host = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [gameCode, setGameCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      choices: ['', '', '', ''],
      answerIndex: 0,
      durationSec: 30
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateChoice = (qIndex: number, cIndex: number, value: string) => {
    const updated = [...questions]
    updated[qIndex].choices[cIndex] = value
    setQuestions(updated)
  }

  const createGame = () => {
    if (questions.length === 0) {
      alert('Please add at least one question')
      return
    }
    
    setIsLoading(true)
    socket.emit('host:create', { questions }, (response: { code: string }) => {
      setGameCode(response.code)
      setIsLoading(false)
      navigate(`/game/${response.code}?host=true`)
    })
  }

  return (
    <div className="card" style={{ maxWidth: '800px', width: '100%' }}>
      <h2>🎓 Create Your Quiz</h2>
      
      {questions.map((question, qIndex) => (
        <div key={question.id} className="quiz-question">
          <h3>Question {qIndex + 1}</h3>
          <input
            className="input"
            placeholder="Enter your question..."
            value={question.text}
            onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {question.choices.map((choice, cIndex) => (
              <div key={cIndex} style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={question.answerIndex === cIndex}
                  onChange={() => updateQuestion(qIndex, 'answerIndex', cIndex)}
                  style={{ marginRight: '0.5rem' }}
                />
                <input
                  className="input"
                  placeholder={`Choice ${cIndex + 1}`}
                  value={choice}
                  onChange={(e) => updateChoice(qIndex, cIndex, e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <label>Duration (seconds): </label>
            <input
              type="number"
              className="input"
              value={question.durationSec}
              onChange={(e) => updateQuestion(qIndex, 'durationSec', parseInt(e.target.value))}
              min="10"
              max="120"
              style={{ width: '80px' }}
            />
          </div>
        </div>
      ))}
      
      <div style={{ marginTop: '2rem' }}>
        <button className="button" onClick={addQuestion}>
          ➕ Add Question
        </button>
        <button 
          className="button" 
          onClick={createGame}
          disabled={isLoading || questions.length === 0}
        >
          {isLoading ? '⏳ Creating...' : '🚀 Create Game'}
        </button>
      </div>
      
      {questions.length === 0 && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '10px',
          fontSize: '0.9rem'
        }}>
          💡 <strong>Getting Started:</strong><br/>
          1. Add at least one question using the button above<br/>
          2. Mark the correct answer for each question<br/>
          3. Set the duration (how long players have to answer)<br/>
          4. Click "Create Game" to generate a game code<br/>
          5. Share the code with players and start the quiz!
        </div>
      )}
    </div>
  )
}

export default Host
