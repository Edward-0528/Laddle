// ---------------------------------------------------------------------------
// App Router
// Defines all application routes and wraps them with the shared layout
// (Navbar + Footer). Protected routes require authentication. Heavy pages
// are code-split with React.lazy for better initial load performance.
// ---------------------------------------------------------------------------

import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import './components/ErrorBoundary.css';
import './App.css';

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuizBuilder = lazy(() => import('./pages/QuizBuilder'));
const JoinGame = lazy(() => import('./pages/JoinGame'));
const Game = lazy(() => import('./pages/Game'));

const Library = lazy(() => import('./pages/Library'));
const Demo = lazy(() => import('./pages/Demo'));

function PageLoader() {
  return (
    <div className="protected-loading">
      <div className="loading-spinner" />
      <p>Loading...</p>
    </div>
  );
}

function App() {
  const { user, signOut } = useAuth();

  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';

  return (
    <ErrorBoundary>
      <div className="app">
        <Navbar
          isAuthenticated={!!user}
          userName={firstName}
          onSignOut={signOut}
        />
        <main className="app-main">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/game/:code" element={<Game />} />
              <Route path="/library" element={<Library />} />
              <Route path="/demo" element={<Demo />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <QuizBuilder />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
