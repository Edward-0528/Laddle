// ---------------------------------------------------------------------------
// App Router
// Defines all application routes and wraps them with the shared layout
// (Navbar + Footer). Protected routes require authentication. Heavy pages
// are code-split with React.lazy for better initial load performance.
// ---------------------------------------------------------------------------

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { getBranding } from './services/branding';
import type { BrandingSettings } from './services/branding';
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
const Results = lazy(() => import('./pages/Results'));
const AssignmentTake = lazy(() => import('./pages/AssignmentTake'));
const AssignmentReport = lazy(() => import('./pages/AssignmentReport'));
const AssignmentsPage = lazy(() => import('./pages/AssignmentsPage'));
const OrgSettings = lazy(() => import('./pages/OrgSettings'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));

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
  const location = useLocation();

  const isGameRoute = location.pathname.startsWith('/game/');

  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';

  const { data: branding } = useQuery<BrandingSettings>({
    queryKey: ['branding', user?.uid],
    queryFn: () => getBranding(user!.uid),
    enabled: !!user,
  });

  return (
    <ErrorBoundary>
      <div className="app">
        {!isGameRoute && (
          <Navbar
            isAuthenticated={!!user}
            userName={firstName}
            onSignOut={signOut}
            branding={branding}
          />
        )}
        <main className="app-main">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/game/:code" element={<Game />} />
              <Route path="/library" element={<Library />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/marketplace" element={<Marketplace />} />

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
              <Route
                path="/results/:gameId"
                element={
                  <ProtectedRoute>
                    <Results />
                  </ProtectedRoute>
                }
              />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/assignment/:code" element={<AssignmentTake />} />
              <Route
                path="/my-progress"
                element={
                  <ProtectedRoute>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignment-report/:id"
                element={
                  <ProtectedRoute>
                    <AssignmentReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignments"
                element={
                  <ProtectedRoute>
                    <AssignmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org-settings"
                element={
                  <ProtectedRoute>
                    <OrgSettings />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </main>
        {!isGameRoute && <Footer />}
      </div>
    </ErrorBoundary>
  );
}

export default App;
