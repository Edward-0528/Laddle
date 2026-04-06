// ---------------------------------------------------------------------------
// Library Page
// Browse pre-configured K-12 quiz templates aligned to California curriculum.
// Teachers can filter by subject and grade band, preview questions, and
// fork any template into their personal dashboard with one click.
// ---------------------------------------------------------------------------

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLibraryQuizzes, forkQuizToUser, seedLibrary } from '../services/library';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { Quiz, SubjectArea, GradeBand } from '../types/quiz';
import {
  SUBJECT_LABELS,
  SUBJECT_COLORS,
  GRADE_BANDS,
} from '../data/libraryQuizzes';
import './Library.css';

// All subjects available in the library
const SUBJECTS: Array<{ value: SubjectArea; label: string }> = [
  { value: 'math',           label: 'Math'                 },
  { value: 'science',        label: 'Science'              },
  { value: 'english',        label: 'English Language Arts'},
  { value: 'history',        label: 'History'              },
  { value: 'social-studies', label: 'Social Studies'       },
];

const Library: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [quizzes, setQuizzes]               = useState<Quiz[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState('');
  const [subjectFilter, setSubjectFilter]   = useState<SubjectArea | ''>(
    (searchParams.get('subject') as SubjectArea) ?? ''
  );
  const [bandFilter, setBandFilter]         = useState<GradeBand | ''>('');
  const [forkingId, setForkingId]           = useState<string | null>(null);
  const [forkedId, setForkedId]             = useState<string | null>(null); // just-forked quiz id
  const [previewQuiz, setPreviewQuiz]       = useState<Quiz | null>(null);
  const [isSeeding, setIsSeeding]           = useState(false);

  // Load (or reload) templates whenever filters change
  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getLibraryQuizzes({
        subject: subjectFilter || undefined,
        gradeBand: bandFilter || undefined,
      });
      setQuizzes(data);
    } catch (err) {
      console.error('[Ladle] Failed to load library:', err);
      setError('Could not load the quiz library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [subjectFilter, bandFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleSeed() {
    setIsSeeding(true);
    setError('');
    try {
      await seedLibrary();
      await load();
    } catch (err) {
      console.error('[Ladle] Seed failed:', err);
      setError('Seeding failed — check the console for details.');
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleFork(quiz: Quiz) {    if (!user) {
      navigate('/login');
      return;
    }
    setForkingId(quiz.id);
    try {
      const newId = await forkQuizToUser(quiz, user.uid);
      setForkedId(newId);
      // Auto-clear the success toast after 4 s
      setTimeout(() => setForkedId(null), 4000);
    } catch (err) {
      console.error('[Ladle] Fork failed:', err);
      setError('Failed to copy the quiz. Please try again.');
    } finally {
      setForkingId(null);
    }
  }

  function subjectColor(subject?: SubjectArea) {
    return subject ? SUBJECT_COLORS[subject] : '#8B6BD4';
  }

  // Derive unique grade bands present in current results for the pill count
  const gradeBandCounts = GRADE_BANDS.map((b) => ({
    ...b,
    count: quizzes.filter((q) => q.gradeBand === b.value).length,
  }));

  return (
    <div className="library-page">
      <div className="container">

        {/* -------- Page Header -------- */}
        <div className="library-header">
          <div className="library-header-text">
            <h1 className="library-title">Quiz Library</h1>
            <p className="library-subtitle">
              Pre-configured quizzes for California K-12 classrooms. Pick a quiz,
              copy it to your dashboard, and launch it in seconds.
            </p>
          </div>
          {user && (
            <Button variant="ghost" size="md" onClick={() => navigate('/dashboard')}>
              My Dashboard
            </Button>
          )}
        </div>

        {/* -------- Success Toast -------- */}
        {forkedId && (
          <div className="library-toast">
            Quiz copied to your library!{' '}
            <button className="library-toast-link" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        )}

        {/* -------- Filter Bar -------- */}
        <div className="library-filters">
          {/* Subject pills */}
          <div className="filter-group">
            <span className="filter-label">Subject</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${subjectFilter === '' ? 'filter-pill-active' : ''}`}
                onClick={() => setSubjectFilter('')}
              >
                All
              </button>
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  className={`filter-pill ${subjectFilter === s.value ? 'filter-pill-active' : ''}`}
                  style={subjectFilter === s.value ? { background: subjectColor(s.value), color: '#fff' } : {}}
                  onClick={() => setSubjectFilter(subjectFilter === s.value ? '' : s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grade band pills */}
          <div className="filter-group">
            <span className="filter-label">Grade Band</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${bandFilter === '' ? 'filter-pill-active' : ''}`}
                onClick={() => setBandFilter('')}
              >
                All Grades
              </button>
              {gradeBandCounts.map((b) => (
                <button
                  key={b.value}
                  className={`filter-pill ${bandFilter === b.value ? 'filter-pill-active' : ''}`}
                  onClick={() => setBandFilter(bandFilter === b.value ? '' : b.value)}
                >
                  {b.label}
                  {b.count > 0 && <span className="filter-pill-count">{b.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* -------- Error -------- */}
        {error && (
          <div className="library-error">
            <p>{error}</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button variant="ghost" size="sm" onClick={() => { setError(''); load(); }}>Retry</Button>
              {!user && (
                <Button variant="primary" size="sm" onClick={() => navigate('/login')}>Sign in to seed</Button>
              )}
              {user && (
                <Button variant="primary" size="sm" onClick={handleSeed} isLoading={isSeeding}>
                  Seed Library Now
                </Button>
              )}
            </div>
          </div>
        )}

        {/* -------- Loading -------- */}
        {isLoading && (
          <div className="library-loading">
            <div className="loading-spinner" />
            <p>Loading quiz library…</p>
          </div>
        )}

        {/* -------- Empty State -------- */}
        {!isLoading && quizzes.length === 0 && !error && (
          <div className="library-empty">
            <div className="library-empty-icon"></div>
            <h2>No quizzes match your filters</h2>
            {subjectFilter || bandFilter ? (
              <>
                <p>Try clearing the subject or grade filter.</p>
                <Button variant="ghost" size="md" onClick={() => { setSubjectFilter(''); setBandFilter(''); }}>
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <p>The quiz library hasn't been seeded yet.</p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSeed}
                  isLoading={isSeeding}
                >
                  Seed Library Now
                </Button>
              </>
            )}
          </div>
        )}

        {/* -------- Quiz Grid -------- */}
        {!isLoading && quizzes.length > 0 && (
          <>
            <p className="library-result-count">
              {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} found
            </p>

            {/* Group by grade band */}
            {(bandFilter ? [bandFilter] : GRADE_BANDS.map((b) => b.value) as GradeBand[])
              .filter((band) => quizzes.some((q) => q.gradeBand === band))
              .map((band) => {
                const bandQuizzes = quizzes.filter((q) => q.gradeBand === band);
                const bandLabel = GRADE_BANDS.find((b) => b.value === band)?.label ?? band;
                return (
                  <section key={band} className="library-section">
                    <h2 className="library-section-title">{bandLabel}</h2>
                    <div className="library-grid">
                      {bandQuizzes.map((quiz) => (
                        <Card
                          key={quiz.id}
                          variant="default"
                          padding="md"
                          className="library-card"
                        >
                          {/* Color bar + subject tag */}
                          <div
                            className="library-card-bar"
                            style={{ background: subjectColor(quiz.subject) }}
                          />
                          <div className="library-card-tags">
                            {quiz.subject && (
                              <span
                                className="library-tag library-tag-subject"
                                style={{
                                  background: `${subjectColor(quiz.subject)}18`,
                                  color: subjectColor(quiz.subject),
                                }}
                              >
                                {SUBJECT_LABELS[quiz.subject]}
                              </span>
                            )}
                            {quiz.gradeLevel && (
                              <span className="library-tag library-tag-grade">
                                Grade {quiz.gradeLevel}
                              </span>
                            )}
                          </div>

                          <h3 className="library-card-title">{quiz.title}</h3>
                          <p className="library-card-desc">{quiz.description}</p>

                          <div className="library-card-meta">
                            <span>{quiz.questions.length} questions</span>
                            {quiz.caStandard && (
                              <span className="library-standard-badge">
                                {quiz.caStandard}
                              </span>
                            )}
                          </div>

                          <div className="library-card-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewQuiz(quiz)}
                            >
                              Preview
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleFork(quiz)}
                              isLoading={forkingId === quiz.id}
                            >
                              {user ? 'Use This Quiz' : 'Sign in to Use'}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })}
          </>
        )}
      </div>

      {/* -------- Question Preview Modal -------- */}
      {previewQuiz && (
        <div className="library-modal-overlay" onClick={() => setPreviewQuiz(null)}>
          <div
            className="library-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="library-modal-header">
              <div>
                <h2 className="library-modal-title">{previewQuiz.title}</h2>
                <p className="library-modal-subtitle">{previewQuiz.description}</p>
              </div>
              <button
                className="library-modal-close"
                onClick={() => setPreviewQuiz(null)}
                aria-label="Close preview"
              >
                x
              </button>
            </div>

            <div className="library-modal-body">
              <p className="library-modal-q-count">
                {previewQuiz.questions.length} Questions
              </p>
              <ol className="library-modal-questions">
                {previewQuiz.questions.map((q, i) => (
                  <li key={q.id ?? i} className="library-modal-question">
                    <p className="library-modal-q-text">
                      <span className="library-modal-q-num">{i + 1}.</span> {q.text}
                    </p>
                    <ul className="library-modal-choices">
                      {q.choices.map((choice, ci) => (
                        <li
                          key={ci}
                          className={`library-modal-choice ${ci === q.correctAnswerIndex ? 'library-modal-choice-correct' : ''}`}
                        >
                          {ci === q.correctAnswerIndex && <span className="choice-check">correct</span>}
                          {choice}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>

            <div className="library-modal-footer">
              <Button variant="ghost" size="md" onClick={() => setPreviewQuiz(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => { setPreviewQuiz(null); handleFork(previewQuiz); }}
                isLoading={forkingId === previewQuiz.id}
              >
                {user ? 'Use This Quiz' : 'Sign in to Use'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
