// ---------------------------------------------------------------------------
// Register Page
// New user registration with email/password and Google sign-in options.
// Redirects to the dashboard after successful account creation.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import './Auth.css';

const Register: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsLoading(true);

    const errorMessage = await register(email, password, displayName.trim());
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
            <h2 className="auth-title">Create Your Account</h2>
            <p className="auth-subtitle">Start creating and sharing quizzes today</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label="Your Name"
              type="text"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              fullWidth
            />

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
            />

            {error && <p className="auth-error">{error}</p>}

            <Button type="submit" variant="secondary" fullWidth isLoading={isLoading}>
              Create Account
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
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Register;
