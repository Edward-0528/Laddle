// ---------------------------------------------------------------------------
// Marketplace Page
// Browse, search, upvote and fork public quizzes created by the community.
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPublicQuizzes, upvoteQuiz, forkQuiz } from '../services/quizzes';
import type { Quiz } from '../types/quiz';
import { CATEGORIES } from '../data/trivia';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Marketplace.css';

const CATEGORY_FILTERS = ['', ...CATEGORIES.map((c) => c.label)];


const Marketplace: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkedId, setForkedId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

  const queryKey = ['marketplace', category, search];
  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey,
    queryFn: () => getPublicQuizzes({ category: category || undefined, search: search || undefined }),
    staleTime: 30_000,
  });

  const handleUpvote = useCallback(async (quiz: Quiz) => {
    if (!user) { navigate('/login'); return; }
    if (upvotedIds.has(quiz.id)) return;
    setUpvotedIds((prev) => new Set([...prev, quiz.id]));
    await upvoteQuiz(quiz.id);
    queryClient.invalidateQueries({ queryKey: ['marketplace'] });
  }, [user, upvotedIds, queryClient, navigate]);

  const handleFork = useCallback(async (quiz: Quiz) => {
    if (!user) { navigate('/login'); return; }
    setForkingId(quiz.id);
    try {
      await forkQuiz(quiz, user.uid);
      setForkedId(quiz.id);
      queryClient.invalidateQueries({ queryKey: ['userQuizzes', user.uid] });
      setTimeout(() => setForkedId(null), 3000);
    } finally {
      setForkingId(null);
    }
  }, [user, queryClient, navigate]);

  return (
    <div className="mp-page">
      <div className="container mp-container">

        {/* Header */}
        <div className="mp-header">
          <div>
            <h1 className="mp-title">Quiz Marketplace</h1>
            <p className="mp-subtitle">Discover, upvote, and fork quizzes shared by the community.</p>
          </div>
          <Button variant="ghost" size="md" onClick={() => navigate('/dashboard')}>
            My Dashboard
          </Button>
        </div>

        {forkedId && (
          <div className="mp-toast" role="status">
            Quiz copied to your dashboard!
          </div>
        )}

        {/* Filters */}
        <div className="mp-filters">
          <div className="mp-search">
            <Input
              placeholder="Search quizzes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
          </div>
          <div className="mp-filter-pills">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c || 'all'}
                className={`mp-pill ${category === c ? 'mp-pill-active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c || 'All categories'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="mp-loading"><div className="loading-spinner" /></div>
        ) : quizzes.length === 0 ? (
          <div className="mp-empty">
            <p>No public quizzes found. Be the first to publish one!</p>
            {user && <Button variant="primary" size="md" onClick={() => navigate('/create')}>Create a Quiz</Button>}
          </div>
        ) : (
          <div className="mp-grid">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="mp-card">
                <div className="mp-card-body" onClick={() => setPreviewQuiz(quiz)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setPreviewQuiz(quiz)}>
                  <div className="mp-card-meta">
                    {quiz.category && <span className="mp-badge mp-badge-subject">{quiz.category}</span>}
                  </div>
                  <h3 className="mp-card-title">{quiz.title}</h3>
                  {quiz.description && <p className="mp-card-desc">{quiz.description}</p>}
                  <div className="mp-card-stats">
                    <span>{quiz.questions.length} questions</span>
                    {quiz.forkCount ? <span>{quiz.forkCount} forks</span> : null}
                    {quiz.stats.timesPlayed ? <span>{quiz.stats.timesPlayed} plays</span> : null}
                  </div>
                  {/* Standards badges */}
                  {quiz.standards && quiz.standards.length > 0 && (
                    <div className="mp-standards">
                      {quiz.standards.slice(0, 3).map((s) => (
                        <span key={s} className="mp-standard-tag">{s}</span>
                      ))}
                      {quiz.standards.length > 3 && <span className="mp-standard-tag">+{quiz.standards.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="mp-card-footer">
                  <button
                    className={`mp-upvote ${upvotedIds.has(quiz.id) ? 'mp-upvote-active' : ''}`}
                    onClick={() => handleUpvote(quiz)}
                    aria-label="Upvote"
                    title={upvotedIds.has(quiz.id) ? 'Upvoted' : 'Upvote'}
                  >
                    {upvotedIds.has(quiz.id) ? '▲' : '△'} {(quiz.rating ?? 0) + (upvotedIds.has(quiz.id) ? 1 : 0)}
                  </button>
                  <div className="mp-card-actions">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewQuiz(quiz)}>Preview</Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleFork(quiz)}
                      isLoading={forkingId === quiz.id}
                      disabled={forkedId === quiz.id}
                    >
                      {forkedId === quiz.id ? 'Copied!' : 'Fork'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewQuiz && (
        <div className="mp-modal-overlay" onClick={() => setPreviewQuiz(null)} role="dialog" aria-modal="true" aria-label="Quiz preview">
          <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h2 className="mp-modal-title">{previewQuiz.title}</h2>
              <button className="mp-modal-close" onClick={() => setPreviewQuiz(null)} aria-label="Close">&times;</button>
            </div>
            {previewQuiz.description && <p className="mp-modal-desc">{previewQuiz.description}</p>}
            <div className="mp-modal-meta">
              {previewQuiz.category && <span className="mp-badge mp-badge-subject">{previewQuiz.category}</span>}
              <span className="mp-badge">{previewQuiz.questions.length} questions</span>
            </div>
            <ol className="mp-preview-list">
              {previewQuiz.questions.slice(0, 5).map((q, i) => (
                <li key={q.id} className="mp-preview-item">
                  <span className="mp-preview-num">{i + 1}</span>
                  <span className="mp-preview-text">{q.text}</span>
                  {q.standards && q.standards.length > 0 && (
                    <div className="mp-standards">
                      {q.standards.map((s) => <span key={s} className="mp-standard-tag">{s}</span>)}
                    </div>
                  )}
                </li>
              ))}
              {previewQuiz.questions.length > 5 && (
                <li className="mp-preview-more">+{previewQuiz.questions.length - 5} more questions</li>
              )}
            </ol>
            <div className="mp-modal-footer">
              <Button variant="secondary" size="md" onClick={() => setPreviewQuiz(null)}>Close</Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => { handleFork(previewQuiz); setPreviewQuiz(null); }}
                isLoading={forkingId === previewQuiz.id}
              >
                Fork to My Quizzes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
