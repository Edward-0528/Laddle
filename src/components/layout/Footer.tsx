// ---------------------------------------------------------------------------
// Footer Component
// Application footer with navigation links, branding, and copyright.
// ---------------------------------------------------------------------------

import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-icon">L</span>
              <span className="footer-logo-text">Ladle</span>
            </Link>
            <p className="footer-tagline">
              The interactive quiz platform for classrooms, events, and teams.
              Create, share, and play quizzes in real time.
            </p>
          </div>

          {/* Product Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Product</h4>
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/join" className="footer-link">Join Quiz</Link>
            <Link to="/create" className="footer-link">Create Quiz</Link>
            <Link to="/dashboard" className="footer-link">Dashboard</Link>
          </div>

          {/* Resources */}
          <div className="footer-col">
            <h4 className="footer-col-title">Resources</h4>
            <Link to="/" className="footer-link">How It Works</Link>
            <Link to="/" className="footer-link">Pricing</Link>
            <Link to="/" className="footer-link">FAQ</Link>
          </div>

          {/* Legal */}
          <div className="footer-col">
            <h4 className="footer-col-title">Legal</h4>
            <Link to="/" className="footer-link">Privacy Policy</Link>
            <Link to="/" className="footer-link">Terms of Service</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            {currentYear} Ladle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
