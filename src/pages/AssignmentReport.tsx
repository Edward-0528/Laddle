// ---------------------------------------------------------------------------
// AssignmentReport Page
// Host views all student responses for a given assignment.
// Shows class summary (average score, completion rate) and per-student detail.
// ---------------------------------------------------------------------------

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAssignment, getAssignmentResponses } from '../services/assignments';
import Button from '../components/ui/Button';
import './AssignmentReport.css';

const AssignmentReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: assignment, isLoading: loadingA } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => getAssignment(id!),
    enabled: !!id,
  });

  const { data: responses = [], isLoading: loadingR } = useQuery({
    queryKey: ['assignmentResponses', id],
    queryFn: () => getAssignmentResponses(id!),
    enabled: !!id,
  });

  if (loadingA || loadingR) {
    return (
      <div className="ar-page">
        <div className="ar-loading">
          <div className="loading-spinner" />
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="ar-page">
        <div className="ar-loading">
          <h2>Assignment not found.</h2>
          <Link to="/dashboard"><Button variant="primary" size="md">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const deadline = new Date(assignment.deadline);
  const isOpen = !assignment.closed && Date.now() <= assignment.deadline;
  const avgScore = responses.length
    ? Math.round(responses.reduce((s, r) => s + r.score, 0) / responses.length)
    : 0;

  // Per-question accuracy
  const qAccuracy = assignment.questions.map((q, qi) => {
    const answered = responses.filter((r) => r.answers[qi]);
    const correct = answered.filter((r) => r.answers[qi]?.correct).length;
    return { text: q.text, pct: answered.length ? Math.round((correct / answered.length) * 100) : null };
  });

  const sorted = [...responses].sort((a, b) => b.score - a.score);

  return (
    <div className="ar-page">
      <div className="container ar-container">

        <div className="ar-header">
          <div>
            <h1 className="ar-title">{assignment.quizTitle}</h1>
            {assignment.label && <p className="ar-label">{assignment.label}</p>}
            <p className="ar-meta">
              <span className={`ar-status-badge ${isOpen ? 'open' : 'closed'}`}>{isOpen ? 'Open' : 'Closed'}</span>
              Code: <strong>{assignment.code}</strong> · Due: {deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" size="md">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="ar-stats-row">
          <div className="ar-stat-card">
            <span className="ar-stat-value">{responses.length}</span>
            <span className="ar-stat-label">Submissions</span>
          </div>
          <div className="ar-stat-card">
            <span className="ar-stat-value">{avgScore}%</span>
            <span className="ar-stat-label">Class Average</span>
          </div>
          <div className="ar-stat-card">
            <span className="ar-stat-value">{responses.filter((r) => r.score >= 70).length}</span>
            <span className="ar-stat-label">Passing (≥70%)</span>
          </div>
          <div className="ar-stat-card">
            <span className="ar-stat-value">{assignment.questions.length}</span>
            <span className="ar-stat-label">Questions</span>
          </div>
        </div>

        {/* Per-question accuracy */}
        {responses.length > 0 && (
          <section className="ar-section">
            <h2 className="ar-section-title">Question Accuracy</h2>
            <div className="ar-q-list">
              {qAccuracy.map((q, i) => (
                <div key={i} className="ar-q-row">
                  <span className="ar-q-num">Q{i + 1}</span>
                  <span className="ar-q-text">{q.text}</span>
                  <div className="ar-q-bar-wrap">
                    {q.pct !== null ? (
                      <>
                        <div className="ar-q-bar-track">
                          <div
                            className="ar-q-bar-fill"
                            style={{ width: `${q.pct}%`, background: q.pct >= 70 ? '#2ecc71' : q.pct >= 40 ? '#f39c12' : '#e74c3c' }}
                          />
                        </div>
                        <span className="ar-q-pct">{q.pct}%</span>
                      </>
                    ) : (
                      <span className="ar-q-pct-na">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Student responses table */}
        <section className="ar-section">
          <h2 className="ar-section-title">Student Results ({responses.length})</h2>
          {responses.length === 0 ? (
            <p className="ar-empty">No submissions yet.</p>
          ) : (
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={r.id} className={i < 3 ? `ar-top-${i + 1}` : ''}>
                      <td className="ar-rank">#{i + 1}</td>
                      <td className="ar-student-name">{r.playerName}</td>
                      <td className="ar-score">{r.score}%</td>
                      <td>{r.answers.filter((a) => a.correct).length} / {r.totalQuestions}</td>
                      <td className="ar-date">{new Date(r.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AssignmentReport;
