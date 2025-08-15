import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="card">
      <h1>🎯 Laddle</h1>
      <p>Interactive Quiz Game Platform</p>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/host">
          <button className="button">
            🎓 Host a Quiz
          </button>
        </Link>
        <Link to="/player">
          <button className="button">
            🙋‍♂️ Join Quiz
          </button>
        </Link>
      </div>
      <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.8 }}>
        Create engaging quizzes for your classroom or event
      </div>
    </div>
  )
}

export default Home
