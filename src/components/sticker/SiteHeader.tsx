// ---------------------------------------------------------------------------
// Sticker Sheet site header for public pages (landing, trivia library).
// ---------------------------------------------------------------------------

import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SiteHeader.css';

export default function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sh">
      <Link to="/" className="sh-logo" aria-label="PopPop home">
        <img src="/favicon.svg" alt="" width={40} height={40} />
        <span className="st-display">PopPop</span>
      </Link>
      <nav className="sh-nav" aria-label="Main">
        <NavLink to="/library" className="sh-link sh-hide-sm">Trivia packs</NavLink>
        <NavLink to="/join" className="sh-link sh-hide-sm">Join</NavLink>
        {user ? (
          <Link to="/dashboard" className="st-btn st-btn--ink sh-cta">My quizzes</Link>
        ) : (
          <>
            <Link to="/login" className="sh-link">Log in</Link>
            <Link to="/library" className="st-btn st-btn--ink sh-cta">Host free</Link>
          </>
        )}
      </nav>
    </header>
  );
}
