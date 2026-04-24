// ---------------------------------------------------------------------------
// Landing Page
// The public-facing home page for the PopPop! platform. Designed to match the
// playful quiz aesthetic with a purple hero section, yellow CTAs,
// feature cards, how-it-works steps, and category browsing.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './Landing.css';

const Landing: React.FC = () => {
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleJoinQuiz = () => {
    if (joinCode.trim().length > 0) {
      navigate(`/join?code=${joinCode.toUpperCase().trim()}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinQuiz();
    }
  };

  return (
    <div className="landing">
      {/* -------- Hero Section -------- */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <h1 className="hero-title">
              Get Ready for a PopPop! Quiz!
            </h1>
            <p className="hero-subtitle">
              Train your brain with smart, community-created quizzes. Host
              interactive quiz sessions for your classroom, team, or event.
              Start improving your knowledge with us today.
            </p>
            <div className="hero-actions">
              <div className="hero-join-form">
                <input
                  className="hero-code-input"
                  placeholder="Enter quiz code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  maxLength={6}
                  aria-label="Quiz join code"
                />
                <Button variant="primary" size="lg" onClick={handleJoinQuiz}>
                  Join Now
                </Button>
              </div>
              <p className="hero-or">or</p>
              <Link to="/register">
                <Button variant="ghost" size="lg" className="hero-create-btn">
                  Create Your Own Quiz
                </Button>
              </Link>
            </div>
          </div>
          <div className="hero-illustration">
            <div className="hero-illustration-card">
              <div className="hero-mascot">
                <Link to="/demo" className="hero-qr-link" title="Try the live demo!">
                  <div className="hero-qr-wrapper">
                    <QRCodeSVG
                      value={`${window.location.origin}/demo`}
                      size={110}
                      bgColor="transparent"
                      fgColor="#ffffff"
                      level="M"
                    />
                  </div>
                </Link>
                <p className="mascot-text">Try It Out Now!</p>
                <Link to="/demo" className="hero-demo-cta">
                  👉 Launch Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-wave">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* -------- Features Section -------- */}
      <section className="features section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Start Your Quiz Adventure</h2>
            <p className="section-subtitle">
              Everything you need to create, share, and play engaging quizzes
              with real-time scoring and live leaderboards.
            </p>
          </div>

          <div className="features-grid">
            <Card variant="outlined" padding="lg">
              <div className="feature-icon feature-icon-purple">RT</div>
              <h3 className="feature-title">Real-Time Multiplayer</h3>
              <p className="feature-desc">
                Players answer simultaneously with live updates. No refreshing
                needed -- everything happens in real time.
              </p>
            </Card>

            <Card variant="outlined" padding="lg">
              <div className="feature-icon feature-icon-yellow">QR</div>
              <h3 className="feature-title">QR Code Joining</h3>
              <p className="feature-desc">
                Generate a QR code for your game lobby. Players scan with their
                phone to join instantly -- no typing needed.
              </p>
            </Card>

            <Card variant="outlined" padding="lg">
              <div className="feature-icon feature-icon-green">LB</div>
              <h3 className="feature-title">Live Leaderboards</h3>
              <p className="feature-desc">
                Track scores in real time with time-based bonus points. See who
                is leading after every question.
              </p>
            </Card>

            <Card variant="outlined" padding="lg">
              <div className="feature-icon feature-icon-blue">SV</div>
              <h3 className="feature-title">Save and Reuse</h3>
              <p className="feature-desc">
                Create a quiz once and launch it whenever you want. Your quizzes
                are saved to your account for easy access.
              </p>
            </Card>

            <Card variant="outlined" padding="lg">
              <div className="feature-icon feature-icon-red">TM</div>
              <h3 className="feature-title">Custom Timers</h3>
              <p className="feature-desc">
                Set question durations from 5 to 120 seconds. Faster answers
                earn more bonus points.
              </p>
            </Card>

            <Card variant="outlined" padding="lg">
              <div className="feature-icon feature-icon-purple">MB</div>
              <h3 className="feature-title">Mobile Friendly</h3>
              <p className="feature-desc">
                Fully responsive design works perfectly on phones, tablets,
                and desktops. Play anywhere.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* -------- How It Works Section -------- */}
      <section className="how-it-works section section-light">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Get started in four simple steps
            </p>
          </div>

          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3 className="step-title">Create an Account</h3>
              <p className="step-desc">
                Sign up for free with your email or Google account.
                It only takes a few seconds.
              </p>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <h3 className="step-title">Build Your Quiz</h3>
              <p className="step-desc">
                Add questions, set answer choices, choose timers,
                and customize your quiz settings.
              </p>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <h3 className="step-title">Share the Code</h3>
              <p className="step-desc">
                Share the game code or QR code with your players.
                They can join from any device.
              </p>
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <h3 className="step-title">Play in Real Time</h3>
              <p className="step-desc">
                Start the quiz and watch as players compete. Results
                and leaderboards update live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------- Categories / K-12 Library Section -------- */}
      <section className="categories section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Ready-Made Quizzes for K-12</h2>
            <p className="section-subtitle">
              Pre-configured quizzes aligned to California curriculum standards.
              Pick a subject, copy the quiz to your dashboard, and launch it in seconds.
            </p>
          </div>

          <div className="categories-grid">
            {[
              { name: 'Math',                subject: 'math',           color: '#6C3FC5', desc: 'CCSS-aligned: counting, multiplication, algebra' },
              { name: 'Science',             subject: 'science',        color: '#4ECDC4', desc: 'CA NGSS: Earth systems, cells, ecology' },
              { name: 'English Language Arts', subject: 'english',      color: '#55A3FF', desc: 'Reading comprehension, writing, grammar' },
              { name: 'History',             subject: 'history',        color: '#F5A623', desc: 'CA HSS: Colonial America through Civil Rights' },
              { name: 'Social Studies',      subject: 'social-studies', color: '#FF6B6B', desc: 'Civics, geography, economics' },
              { name: 'All Subjects',        subject: '',               color: '#8B6BD4', desc: 'Browse the full K-12 quiz library' },
            ].map((category) => (
              <Link
                key={category.name}
                to={category.subject ? `/library?subject=${category.subject}` : '/library'}
                style={{ textDecoration: 'none' }}
              >
                <Card variant="default" padding="md" className="category-card">
                  <div
                    className="category-color-bar"
                    style={{ background: category.color }}
                  />
                  <h4 className="category-name">{category.name}</h4>
                  <p className="category-count">{category.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* -------- Stats Section -------- */}
      <section className="stats section section-light">
        <div className="container">
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-number">10,000+</span>
              <span className="stat-label">Quizzes Created</span>
            </div>
            <div className="stat">
              <span className="stat-number">50,000+</span>
              <span className="stat-label">Players</span>
            </div>
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Schools and Teams</span>
            </div>
            <div className="stat">
              <span className="stat-number">4.8 / 5</span>
              <span className="stat-label">User Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------- CTA Section -------- */}
      <section className="cta section">
        <div className="container cta-inner">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-subtitle">
            Create your free account and build your first quiz in minutes.
          </p>
          <div className="cta-actions">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Get Started for Free
              </Button>
            </Link>
            <Link to="/join">
              <Button variant="ghost" size="lg" className="cta-join-btn">
                Join a Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
