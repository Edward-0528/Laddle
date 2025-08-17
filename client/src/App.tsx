import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Host from './pages/Host'
import Player from './pages/Player'
import Game from './pages/Game'
import TestPage from './pages/TestPage'
import './App.css'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/player" element={<Player />} />
        <Route path="/game/:code" element={<Game />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </div>
  )
}

export default App
