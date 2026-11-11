// ---------------------------------------------------------------------------
// Trivia Library (Sticker Sheet)
// Ready-made trivia packs for pub quizzes, parties and game nights. Anyone
// can host a pack in one tap, no account needed. Signed-in hosts can also
// copy a pack into their own quizzes to edit it.
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SiteHeader from '../components/sticker/SiteHeader';
import Avatar from '../components/sticker/Avatar';
import AnswerShape, { answerStyle, CheckIcon } from '../components/sticker/AnswerShape';
import { CATEGORIES, categoryOf, isCategoryId, mixedPack, packsIn, type TriviaPack } from '../data/trivia';
import { copyPackToUser, hostPack } from '../services/library';
import './Library.css';

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

const Library: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get('category');
  const category = isCategoryId(raw) ? raw : undefined;

  const [busy, setBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [peek, setPeek] = useState<TriviaPack | null>(null);

  const packs = useMemo(() => packsIn(category), [category]);
  const totalQuestions = useMemo(() => packsIn().reduce((n, p) => n + p.questions.length, 0), []);

  function pickCategory(id?: string) {
    const next = new URLSearchParams(params);
    if (id) next.set('category', id); else next.delete('category');
    setParams(next, { replace: true });
  }

  async function host(pack: TriviaPack) {
    setBusy(`host:${pack.id}`);
    setError('');
    try {
      const code = await hostPack(pack);
      navigate(`/game/${code}?host=true`);
    } catch (err: any) {
      setError(err?.message ?? 'Could not start the game. Please try again.');
      setBusy(null);
    }
  }

  async function copy(pack: TriviaPack) {
    if (!user) { navigate('/login'); return; }
    setBusy(`copy:${pack.id}`);
    setError('');
    try {
      await copyPackToUser(pack, user.uid);
      setCopiedId(pack.id);
      setTimeout(() => setCopiedId((id) => (id === pack.id ? null : id)), 4000);
    } catch (err: any) {
      setError(err?.code === 'permission-denied' ? 'Sign in again to copy packs.' : 'Could not copy that pack. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const hosting = busy?.startsWith('host:');

  return (
    <div className="st-stage lib">
      <SiteHeader />

      <section className="lib-hero">
        <div>
          <span className="st-tag lib-hero__tag">{packsIn().length} packs · {totalQuestions} questions</span>
          <h1 className="st-display lib-hero__title">Pick a pack. Press play.</h1>
          <p className="lib-hero__sub">
            Ready-made trivia for pub quiz night, office parties and the family Christmas showdown.
            Hosting is free and nobody needs an account.
          </p>
        </div>
        <button type="button" className="st-sticker lib-mixed" onClick={() => host(mixedPack())} disabled={!!busy}>
          <span className="lib-mixed__avatars" aria-hidden="true">
            <Avatar kind="goose" size={56} decorative />
            <Avatar kind="tomato" size={56} decorative />
            <Avatar kind="frog" size={56} decorative />
          </span>
          <span className="st-display lib-mixed__title">Can't decide?</span>
          <span className="lib-mixed__sub">Host a Mixed Bag of 15 random questions</span>
          <span className="st-btn st-btn--lemon lib-mixed__go">Shuffle &amp; host</span>
        </button>
      </section>

      <nav className="lib-cats" aria-label="Categories">
        <button type="button" className={`lib-cat ${!category ? 'is-on' : ''}`} onClick={() => pickCategory()} aria-pressed={!category}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`lib-cat ${category === c.id ? 'is-on' : ''}`}
            style={{ ['--cat' as string]: c.color, ['--cat-ink' as string]: c.ink }}
            onClick={() => pickCategory(c.id)}
            aria-pressed={category === c.id}
          >
            <Avatar kind={c.avatar} size={30} decorative />
            {c.label}
          </button>
        ))}
      </nav>

      {error && <div className="st-error lib-error" role="alert">{error}</div>}

      <section className="lib-grid" aria-live="polite">
        {packs.map((p, i) => {
          const c = categoryOf(p.category);
          return (
            <article key={p.id} className="st-sticker lib-pack" style={{ ['--tilt' as string]: `${i % 3 === 0 ? -1 : i % 3 === 1 ? 0.8 : -0.4}deg` }}>
              <div className="lib-pack__top" style={{ background: c.color, color: c.ink }}>
                <Avatar kind={c.avatar} size={64} decorative />
                <span className="lib-pack__cat">{c.label}</span>
              </div>
              <div className="lib-pack__body">
                <h2 className="st-display lib-pack__title">{p.title}</h2>
                <p className="lib-pack__blurb">{p.blurb}</p>
                <div className="lib-pack__meta">
                  <span>{p.questions.length} questions</span>
                  <span className={`lib-diff lib-diff--${p.difficulty}`}>{DIFFICULTY_LABEL[p.difficulty]}</span>
                </div>
                <div className="lib-pack__actions">
                  <button type="button" className="st-btn st-btn--ink lib-pack__host" onClick={() => host(p)} disabled={!!busy}>
                    {busy === `host:${p.id}` ? 'Starting…' : 'Host now'}
                  </button>
                  <button type="button" className="st-btn st-btn--quiet lib-pack__small" onClick={() => setPeek(p)}>Peek</button>
                  <button type="button" className="st-btn st-btn--quiet lib-pack__small" onClick={() => copy(p)} disabled={!!busy}>
                    {copiedId === p.id ? 'Copied!' : busy === `copy:${p.id}` ? 'Copying…' : 'Copy & edit'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <p className="lib-foot">
        Want your own round? <button type="button" className="lib-linkbtn" onClick={() => navigate(user ? '/create' : '/register')}>Write a quiz</button>
        {copiedId && <> · Copied packs live in <button type="button" className="lib-linkbtn" onClick={() => navigate('/dashboard')}>My quizzes</button></>}
      </p>

      {/* Peek: answers shown, so it's for the host's eyes only */}
      {peek && (
        <div className="lib-overlay" role="dialog" aria-modal="true" aria-label={`${peek.title} questions`} onClick={() => setPeek(null)}>
          <div className="st-sticker lib-peek st-anim-peel" onClick={(e) => e.stopPropagation()}>
            <header className="lib-peek__head">
              <div>
                <span className="lib-peek__cat">{categoryOf(peek.category).label}</span>
                <h2 className="st-display">{peek.title}</h2>
                <p className="lib-peek__warn">Spoilers: correct answers are ticked. Don't show the room!</p>
              </div>
              <button type="button" className="lib-peek__close" onClick={() => setPeek(null)} aria-label="Close">×</button>
            </header>
            <ol className="lib-peek__list">
              {peek.questions.map((q, qi) => (
                <li key={qi}>
                  <p className="lib-peek__q">{q.text}</p>
                  <div className="lib-peek__choices">
                    {q.choices.map((ch, ci) => {
                      const s = answerStyle(ci);
                      const right = ci === q.answer;
                      return (
                        <span key={ci} className={`lib-peek__choice ${right ? 'is-right' : ''}`}>
                          <AnswerShape index={ci} size={14} fill={s.color} />
                          {ch}
                          {right && <CheckIcon size={14} color="var(--st-ink)" />}
                        </span>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
            <div className="lib-peek__actions">
              <button type="button" className="st-btn st-btn--ink" onClick={() => host(peek)} disabled={!!busy}>Host this pack</button>
            </div>
          </div>
        </div>
      )}

      {hosting && (
        <div className="lib-overlay lib-overlay--busy" role="status">
          <div className="st-sticker lib-busy">
            <Avatar kind="snail" size={88} decorative />
            <p className="st-display">Setting up your game<span className="st-dots"><span>.</span><span>.</span><span>.</span></span></p>
            <p className="lib-busy__sub">If the server was asleep this can take up to 30 seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
