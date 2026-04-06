// ---------------------------------------------------------------------------
// Login Page
// Provides email/password and Google sign-in options. Redirects to the
// dashboard after successful authentication.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import './Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const errorMessage = await login(email, password);
    setIsLoading(false);

    if (errorMessage) {
      setError(errorMessage);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    const errorMessage = await loginWithGoogle();
    setIsLoading(false);

    if (errorMessage) {
      setError(errorMessage);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card variant="elevated" padding="lg">
          <div className="auth-header">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your Ladle account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />

            {error && <p className="auth-error">{error}</p>}

            <Button type="submit" variant="secondary" fullWidth isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <Button
            variant="ghost"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            Continue with Google
          </Button>

          <p className="auth-footer-text">
            Do not have an account?{' '}
            <Link to="/register" className="auth-link">
              Create one
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
