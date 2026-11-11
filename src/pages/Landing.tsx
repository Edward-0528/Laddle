// ---------------------------------------------------------------------------
// Landing Page (Sticker Sheet)
// Public home for PopPop. Two jobs, in this order: get a guest with a code
// into a game in one step, and show a host how little it takes to run one.
// It has its own header and footer; the app navbar is hidden on this page.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../components/sticker/Avatar';
import AnswerShape, { answerStyle, CheckIcon } from '../components/sticker/AnswerShape';
import { AVATARS } from '../components/sticker/avatars';
import SiteHeader from '../components/sticker/SiteHeader';
import { CATEGORIES, packsIn } from '../data/trivia';
import './Landing.css';

const WALL = [
  { kind: 'goose', name: 'Maya', tilt: -6 },
  { kind: 'tomato', name: 'Leo', tilt: 4 },
  { kind: 'frog', name: 'Ava', tilt: -3 },
  { kind: 'waffle', name: 'Sam', tilt: 6 },
  { kind: 'penguin', name: 'Noah', tilt: -5 },
  { kind: 'taco', name: 'Zoe', tilt: 3 },
] as const;

const DEMO_ANSWERS = ['Hoth', 'Tatooine', 'Endor', 'Naboo'];

const FEATURES = [
  { title: 'No sign-up for players', body: 'Scan the QR code or type the code, pick a sticker, play. That is the whole onboarding.', color: 'var(--st-lemon)', avatar: 'goose' },
  { title: 'Drop out, hop back in', body: 'Phone died? Wi-Fi blinked? Players rejoin with their score intact, right where the game is.', color: 'var(--st-answer-2)', avatar: 'snail' },
  { title: 'Readable by everyone', body: 'Every answer has a colour, a shape and a letter, so nobody needs to tell red from green.', color: 'var(--st-answer-1)', avatar: 'jelly' },
  { title: 'Hundreds of questions', body: 'Grab a ready-made pack, write your own round, or let AI draft one from any topic.', color: 'var(--st-correct)', avatar: 'waffle' },
  { title: 'Teams mode', body: 'Pub teams, office departments, kids vs adults: split the room with one tap.', color: 'var(--st-answer-4)', avatar: 'broccoli' },
  { title: 'Made for big screens', body: 'A giant code, a fuse timer and live reveal charts that read from the back row.', color: 'var(--st-answer-3)', avatar: 'moon' },
] as const;


const Landing: React.FC = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  function join(e: React.FormEvent) {
    e.preventDefault();
    navigate(clean ? `/j/${clean}` : '/join');
  }

  return (
    <div className="st-stage lp">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="lp-hero">
        <div className="lp-hero__copy">
          <span className="st-tag lp-hero__tag">Trivia night, sorted</span>
          <h1 className="st-display lp-hero__title">
            Trivia night, but <span className="lp-hl">everyone</span> gets a sticker.
          </h1>
          <p className="lp-hero__sub">
            Pub quiz, office party or Christmas with the family: put a code on the TV,
            phones join in seconds with no app and no accounts, and the room goes loud.
          </p>

          <form className="st-sticker lp-join" onSubmit={join}>
            <label className="st-label" htmlFor="lp-code">Got a game code?</label>
            <div className="lp-join__row">
              <input
                id="lp-code"
                className="st-input st-input--code lp-join__input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABC123"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button type="submit" className="st-btn st-btn--ink lp-join__go">Jump in</button>
            </div>
          </form>

          <div className="lp-hero__host">
            <Link to="/library" className="st-btn st-btn--lemon st-btn--lg">Pick a trivia pack</Link>
            <Link to="/demo" className="lp-link">or try the demo</Link>
          </div>
        </div>

        {/* Big-screen preview: lobby wall + a question */}
        <div className="lp-hero__art" aria-hidden="true">
          <div className="st-sticker lp-screen">
            <div className="lp-screen__bar">
              <span className="lp-screen__code">K7QX2</span>
              <span className="lp-screen__count">6 stuck in</span>
            </div>
            <div className="lp-wall">
              {WALL.map((p, i) => (
                <div
                  key={p.kind}
                  className="st-chip lp-wall__chip st-anim-slap"
                  style={{ ['--tilt' as string]: `${p.tilt}deg`, animationDelay: `${300 + i * 180}ms` }}
                >
                  <Avatar kind={p.kind} size={44} decorative />
                  {p.name}
                </div>
              ))}
            </div>
          </div>

          <div className="st-sticker lp-phone">
            <div className="lp-phone__q st-display">Which planet is Luke Skywalker from?</div>
            <div className="lp-phone__fuse"><span /></div>
            <div className="lp-phone__grid">
              {DEMO_ANSWERS.map((a, i) => {
                const s = answerStyle(i);
                return (
                  <div key={a} className={`lp-tile ${i === 1 ? 'is-picked' : ''}`} style={{ background: s.color, color: s.ink }}>
                    <AnswerShape index={i} size={18} />
                    <span>{a}</span>
                    {i === 1 && <span className="lp-tile__ok"><CheckIcon size={14} color="var(--st-ink)" /></span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lp-float lp-float--a"><Avatar kind="tomato" size={96} decorative /></div>
          <div className="lp-float lp-float--b"><Avatar kind="donut" size={78} decorative /></div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="lp-section">
        <h2 className="st-display lp-h2">Three steps. Zero guesswork.</h2>
        <ol className="lp-steps">
          <li className="st-sticker lp-step">
            <span className="lp-step__num" style={{ background: 'var(--st-lemon)' }}>1</span>
            <h3 className="st-display">Pick a trivia pack</h3>
            <p>Star Wars, Disney, 90s, Christmas and more. Tap Host and a giant code and QR code land on the TV.</p>
          </li>
          <li className="st-sticker lp-step">
            <span className="lp-step__num" style={{ background: 'var(--st-answer-1)' }}>2</span>
            <h3 className="st-display">Everyone scans and sticks</h3>
            <p>Phones open the game straight away. Pick a silly sticker, type a name, and you're on the wall.</p>
          </li>
          <li className="st-sticker lp-step">
            <span className="lp-step__num" style={{ background: 'var(--st-answer-2)' }}>3</span>
            <h3 className="st-display">Everybody plays</h3>
            <p>Fast answers score more. Reveals, a live leaderboard and a confetti podium crown the winner.</p>
          </li>
        </ol>
      </section>

      {/* ---------- Avatar parade ---------- */}
      <section className="lp-parade" aria-label="Twenty sticker characters to choose from">
        <h2 className="st-display lp-h2">Pick your silly.</h2>
        <p className="lp-lede">Twenty characters, from a literal silly goose to a tow truck tomato.</p>
        <div className="lp-parade__track">
          <div className="lp-parade__row">
            {[...AVATARS, ...AVATARS].map((a, i) => (
              <div key={`${a.kind}-${i}`} className="lp-parade__item" aria-hidden={i >= AVATARS.length}>
                <Avatar kind={a.kind} size={92} decorative={i >= AVATARS.length} />
                <span>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="lp-section">
        <h2 className="st-display lp-h2">Built for real rooms.</h2>
        <div className="lp-features">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="st-sticker lp-feature" style={{ ['--tilt' as string]: `${i % 2 ? 1.2 : -1.2}deg` }}>
              <div className="lp-feature__badge" style={{ background: f.color }}>
                <Avatar kind={f.avatar} size={56} decorative />
              </div>
              <h3 className="st-display">{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Library ---------- */}
      <section className="lp-section lp-library">
        <h2 className="st-display lp-h2">Packs for every crowd.</h2>
        <p className="lp-lede">{packsIn().length} ready-made trivia packs. Pick one and host it in a single tap.</p>
        <div className="lp-subjects">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/library?category=${c.id}`} className="lp-subject" style={{ background: c.color, color: c.ink }}>
              <Avatar kind={c.avatar} size={28} decorative />
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="lp-cta">
        <div className="lp-cta__stickers" aria-hidden="true">
          <Avatar kind="frog" size={84} decorative />
          <Avatar kind="banana" size={70} decorative />
          <Avatar kind="cupcake" size={84} decorative />
        </div>
        <h2 className="st-display lp-cta__title">Your next trivia night starts with one code.</h2>
        <div className="lp-cta__actions">
          <Link to="/library" className="st-btn st-btn--ink st-btn--lg">Host a game, free</Link>
          <Link to="/join" className="st-btn st-btn--lemon st-btn--lg">Join a game</Link>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="lp-foot">
        <span className="st-display lp-foot__brand">PopPop</span>
        <nav className="lp-foot__links" aria-label="Footer">
          <Link to="/join">Join</Link>
          <Link to="/library">Trivia packs</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
        </nav>
        <span className="lp-foot__copy">© {new Date().getFullYear()} PopPop</span>
      </footer>
    </div>
  );
};

export default Landing;
