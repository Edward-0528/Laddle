// ---------------------------------------------------------------------------
// Navbar Component
// Top navigation bar with logo, navigation links, and authentication
// actions. Becomes sticky on scroll with a subtle glass morphism effect.
// Responsive with a mobile hamburger menu.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import './Navbar.css';

interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string;
}

interface NavbarProps {
  isAuthenticated?: boolean;
  userName?: string;
  onSignOut?: () => void;
  branding?: BrandingSettings;
}

const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated = false,
  userName,
  onSignOut,
  branding,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className="navbar"
      role="navigation"
      aria-label="Main navigation"
      style={branding?.primaryColor ? { '--color-primary': branding.primaryColor } as React.CSSProperties : undefined}
    >
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="navbar-brand-logo" />
          ) : (
            <>
              <span className="navbar-logo-icon">🎉</span>
              <span className="navbar-logo-text">PopPop!</span>
            </>
          )}
        </Link>

        {/* Desktop Navigation Links */}
        <div className="navbar-links">
          <Link
            to="/"
            className={`navbar-link ${isActive('/') ? 'navbar-link-active' : ''}`}
          >
            Home
          </Link>
          {!isAuthenticated && (
            <Link
              to="/demo"
              className={`navbar-link ${isActive('/demo') ? 'navbar-link-active' : ''}`}
            >
              Try Demo
            </Link>
          )}
          <Link
            to="/join"
            className={`navbar-link ${isActive('/join') ? 'navbar-link-active' : ''}`}
          >
            Join Quiz
          </Link>
          <Link
            to="/marketplace"
            className={`navbar-link ${isActive('/marketplace') ? 'navbar-link-active' : ''}`}
          >
            Marketplace
          </Link>
          {!isAuthenticated && (
            <Link
              to="/pricing"
              className={`navbar-link ${isActive('/pricing') ? 'navbar-link-active' : ''}`}
            >
              Pricing
            </Link>
          )}
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`navbar-link ${isActive('/dashboard') ? 'navbar-link-active' : ''}`}
              >
                My Quizzes
              </Link>
              <Link
                to="/create"
                className={`navbar-link ${isActive('/create') ? 'navbar-link-active' : ''}`}
              >
                Create Quiz
              </Link>
              <Link
                to="/org-settings"
                className={`navbar-link ${isActive('/org-settings') ? 'navbar-link-active' : ''}`}
              >
                Brand Settings
              </Link>
              <Link
                to="/my-progress"
                className={`navbar-link ${isActive('/my-progress') ? 'navbar-link-active' : ''}`}
              >
                My Progress
              </Link>
            </>
          )}
        </div>

        {/* Auth Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="navbar-user">
              <span className="navbar-user-name">{userName}</span>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`navbar-mobile-btn ${isMobileMenuOpen ? 'navbar-mobile-btn-open' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="navbar-mobile-line" />
          <span className="navbar-mobile-line" />
          <span className="navbar-mobile-line" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <Link to="/" className="navbar-mobile-link" onClick={closeMobileMenu}>
            Home
          </Link>
          <Link to="/demo" className="navbar-mobile-link" onClick={closeMobileMenu}>
            Try Demo
          </Link>
          <Link to="/join" className="navbar-mobile-link" onClick={closeMobileMenu}>
            Join Quiz
          </Link>
          {!isAuthenticated && (
            <Link to="/demo" className="navbar-mobile-link" onClick={closeMobileMenu}>
              Try Demo
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="navbar-mobile-link" onClick={closeMobileMenu}>
                My Quizzes
              </Link>
              <Link to="/create" className="navbar-mobile-link" onClick={closeMobileMenu}>
                Create Quiz
              </Link>
              <Link to="/assignments" className="navbar-mobile-link" onClick={closeMobileMenu}>
                Assignments
              </Link>
              <Link to="/org-settings" className="navbar-mobile-link" onClick={closeMobileMenu}>
                Brand Settings
              </Link>
              <button className="navbar-mobile-link" onClick={() => { closeMobileMenu(); onSignOut?.(); }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-mobile-link" onClick={closeMobileMenu}>
                Sign In
              </Link>
              <Link to="/register" className="navbar-mobile-link" onClick={closeMobileMenu}>
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
