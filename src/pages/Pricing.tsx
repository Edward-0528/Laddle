// ---------------------------------------------------------------------------
// Pricing Page
// Displays the Free vs Pro plans and initiates Stripe Checkout for Pro.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { startProCheckout } from '../services/billing';
import Button from '../components/ui/Button';
import './Pricing.css';

const FREE_FEATURES = [
  'Up to 10 quizzes',
  'Live game lobbies',
  'Library quizzes',
  'Basic analytics',
];

const PRO_FEATURES = [
  'Unlimited quizzes',
  'AI question generation',
  'Async assignments & homework',
  'Custom branding (logo + colour)',
  'Priority support',
  'Advanced analytics',
];

const Pricing: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const upgraded = searchParams.get('upgraded') === '1' || searchParams.get('upgraded') === 'true';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await startProCheckout(user.uid, user.email || '');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="pricing-page">
      <div className="container pricing-container">
        {/* Header */}
        <div className="pricing-header">
          <h1 className="pricing-title">Simple, transparent pricing</h1>
          <p className="pricing-subtitle">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        {/* Upgrade success banner */}
        {upgraded && (
          <div className="pricing-banner pricing-banner-success" role="alert">
            🎉 Welcome to Pro! Your account has been upgraded.{' '}
            <Link to="/dashboard">Go to Dashboard →</Link>
          </div>
        )}

        {error && (
          <div className="pricing-banner pricing-banner-error" role="alert">
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="pricing-cards">
          {/* Free */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h2 className="pricing-plan-name">Free</h2>
              <div className="pricing-price">
                <span className="pricing-amount">$0</span>
                <span className="pricing-period">/ month</span>
              </div>
              <p className="pricing-plan-desc">Everything you need to get started.</p>
            </div>
            <ul className="pricing-features">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="pricing-feature">
                  <span className="pricing-check" aria-hidden="true">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="pricing-card-footer">
              {user ? (
                <Link to="/dashboard">
                  <Button variant="secondary" size="lg" fullWidth>
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button variant="secondary" size="lg" fullWidth>
                    Get Started Free
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Pro */}
          <div className="pricing-card pricing-card-pro">
            <div className="pricing-card-badge">Most Popular</div>
            <div className="pricing-card-header">
              <h2 className="pricing-plan-name">Pro</h2>
              <div className="pricing-price">
                <span className="pricing-amount">$9</span>
                <span className="pricing-period">/ month</span>
              </div>
              <p className="pricing-plan-desc">Unlock the full power of PopPop!</p>
            </div>
            <ul className="pricing-features">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="pricing-feature">
                  <span className="pricing-check" aria-hidden="true">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="pricing-card-footer">
              {user ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleUpgrade}
                  isLoading={loading}
                >
                  Upgrade to Pro
                </Button>
              ) : (
                <Link to="/register">
                  <Button variant="primary" size="lg" fullWidth>
                    Start Free Trial
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="pricing-faq">
          <h2 className="pricing-faq-title">Frequently asked questions</h2>
          <div className="pricing-faq-grid">
            <div className="pricing-faq-item">
              <h3>Can I cancel anytime?</h3>
              <p>Yes. Cancel your subscription at any time from your billing portal — no questions asked.</p>
            </div>
            <div className="pricing-faq-item">
              <h3>What payment methods are accepted?</h3>
              <p>All major credit and debit cards via Stripe. Your card details are never stored on our servers.</p>
            </div>
            <div className="pricing-faq-item">
              <h3>Do students need an account?</h3>
              <p>No — students can join live games and take assignments with just a name and a code.</p>
            </div>
            <div className="pricing-faq-item">
              <h3>Is there a free trial?</h3>
              <p>The Free plan gives you full access to the core features with no time limit.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
