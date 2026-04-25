// ---------------------------------------------------------------------------
// AssignmentTake Page
// Students visit /assignment/:code to complete an async quiz at their own pace.
// No real-time socket — all data is persisted directly to Firestore on submit.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  getAssignmentByCode,
  submitAssignmentResponse,
  hasStudentSubmitted,
} from '../services/assignments';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import type { Assignment } from '../types/assignment';
import type { AssignmentAnswer } from '../types/assignment';
import './AssignmentTake.css';

const CHOICE_COLORS = [
  { label: 'A', base: '#e74c3c', light: '#fde8e8' },
  { label: 'B', base: '#3498db', light: '#e8f4fd' },
  { label: 'C', base: '#2ecc71', light: '#e8faf0' },
  { label: 'D', base: '#f39c12', light: '#fef9e7' },
];

type Screen = 'loading' | 'enter-name' | 'question' | 'submitted' | 'error' | 'closed' | 'already-submitted';

const AssignmentTake: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [screen, setScreen] = useState<Screen>('loading');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<AssignmentAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionStartRef = useRef<number>(Date.now());

  // Load assignment on mount
  useEffect(() => {
    if (!code) { setScreen('error'); return; }
    getAssignmentByCode(code).then((a) => {
      if (!a) { setScreen('error'); return; }
      if (a.closed || Date.now() > a.deadline) { setScreen('closed'); return; }
      setAssignment(a);
      setScreen('enter-name');
    });
  }, [code]);

  async function handleStartQuiz() {
    const name = playerName.trim();
    if (!name) { setNameError('Please enter your name.'); return; }
    if (!assignment) return;

    const alreadyDone = await hasStudentSubmitted(assignment.id, name);
    if (alreadyDone) { setScreen('already-submitted'); return; }

    setNameError('');
    questionStartRef.current = Date.now();
    setQIndex(0);
    setAnswers([]);
    setSelected(null);
    setScreen('question');
  }

  function handleSelectChoice(idx: number) {
    if (selected !== null) return; // already locked
    const q = assignment!.questions[qIndex];
    const timeTakenMs = Date.now() - questionStartRef.current;
    const correct = idx === q.correctAnswerIndex;

    setSelected(idx);
    setAnswers((prev) => [
      ...prev,
      { questionId: q.id, selectedIndex: idx, correct, timeTakenMs },
    ]);
  }

  async function handleNext() {
    if (!assignment) return;
    const isLast = qIndex >= assignment.questions.length - 1;

    if (isLast) {
      // Submit
      setIsSubmitting(true);
      const allAnswers = answers;
      const correctCount = allAnswers.filter((a) => a.correct).length;
      const score = Math.round((correctCount / assignment.questions.length) * 100);
      setFinalScore(score);

      await submitAssignmentResponse({
        assignmentId: assignment.id,
        assignmentCode: assignment.code,
        playerName: playerName.trim(),
        answers: allAnswers,
        score,
        totalQuestions: assignment.questions.length,
        submittedAt: Date.now(),
      });
      setIsSubmitting(false);
      setScreen('submitted');
    } else {
      questionStartRef.current = Date.now();
      setSelected(null);
      setQIndex((i) => i + 1);
    }
  }

  // ---- Screens ----

  if (screen === 'loading') {
    return (
      <div className="at-page">
        <div className="at-center">
          <div className="loading-spinner" />
          <p>Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="at-page">
        <div className="at-center">
          <h2>Assignment Not Found</h2>
          <p>Check the code and try again.</p>
        </div>
      </div>
    );
  }

  if (screen === 'closed') {
    return (
      <div className="at-page">
        <div className="at-center">
          <h2>Assignment Closed</h2>
          <p>The deadline for this assignment has passed.</p>
        </div>
      </div>
    );
  }

  if (screen === 'already-submitted') {
    return (
      <div className="at-page">
        <div className="at-center">
          <h2>Already Submitted</h2>
          <p>You have already completed <strong>{assignment?.quizTitle}</strong>.</p>
        </div>
      </div>
    );
  }

  if (screen === 'submitted') {
    const correct = answers.filter((a) => a.correct).length;
    return (
      <div className="at-page">
        <div className="at-center at-submitted">
          <div className="at-submitted-icon">
            {finalScore >= 70 ? '' : ''}
          </div>
          <h2>Assignment Complete!</h2>
          <p className="at-submitted-name">{playerName}</p>
          <div className="at-score-circle">
            <span className="at-score-number">{finalScore}%</span>
            <span className="at-score-label">Score</span>
          </div>
          <p className="at-correct-count">
            {correct} / {assignment?.questions.length} correct
          </p>
          <p className="at-submitted-sub">Your responses have been saved. You can close this tab.</p>
        </div>
      </div>
    );
  }

  if (screen === 'enter-name') {
    const deadline = new Date(assignment!.deadline);
    return (
      <div className="at-page">
        <div className="at-name-card">
          <h1 className="at-quiz-title">{assignment!.quizTitle}</h1>
          {assignment!.label && <p className="at-label">{assignment!.label}</p>}
          <p className="at-deadline">
            Due: <strong>{deadline.toLocaleDateString()} at {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          </p>
          <p className="at-question-count">{assignment!.questions.length} question{assignment!.questions.length !== 1 ? 's' : ''}</p>
          <div className="at-name-form">
            <Input
              label="Your Name"
              placeholder="Enter your full name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartQuiz()}
              fullWidth
              error={nameError}
            />
            <Button variant="primary" size="lg" onClick={handleStartQuiz} fullWidth>
              Start Assignment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Question screen ----
  const q = assignment!.questions[qIndex];
  const total = assignment!.questions.length;
  const progress = ((qIndex + (selected !== null ? 1 : 0)) / total) * 100;

  return (
    <div className="at-page">
      <div className="at-question-wrap">
        {/* Progress bar */}
        <div className="at-progress-bar" role="progressbar" aria-valuenow={qIndex + 1} aria-valuemin={1} aria-valuemax={total} aria-label={`Question ${qIndex + 1} of ${total}`}>
          <div className="at-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="at-q-meta">
          <span>Q{qIndex + 1} / {total}</span>
          <span className="at-player-name-tag">{playerName}</span>
        </div>

        <Card variant="default" padding="lg" className="at-question-card">
          <h2 className="at-question-text">{q.text}</h2>
        </Card>

        <div className="at-choices" role="group" aria-label="Answer choices">
          {q.choices.map((choice, i) => {
            const color = CHOICE_COLORS[i % CHOICE_COLORS.length];
            const isSelected = selected === i;
            const isCorrect = selected !== null && i === q.correctAnswerIndex;
            const isWrong = selected !== null && isSelected && !isCorrect;

            return (
              <button
                key={i}
                className={`at-choice ${isSelected ? 'at-choice-selected' : ''} ${isCorrect && selected !== null ? 'at-choice-correct' : ''} ${isWrong ? 'at-choice-wrong' : ''}`}
                style={{
                  borderColor: selected === null ? color.base : undefined,
                  background: isSelected ? (isWrong ? '#fde8e8' : '#e8faf0') : isCorrect && selected !== null ? '#e8faf0' : undefined,
                }}
                onClick={() => handleSelectChoice(i)}
                disabled={selected !== null}
                aria-pressed={isSelected}
                aria-label={`${color.label}: ${choice}`}
              >
                <span className="at-choice-letter" style={{ background: color.base }} aria-hidden="true">{color.label}</span>
                <span className="at-choice-text">{choice}</span>
                {isCorrect && selected !== null && (
                  <span className="at-choice-badge at-correct-badge" aria-label="Correct">Correct</span>
                )}
                {isWrong && (
                  <span className="at-choice-badge at-wrong-badge" aria-label="Wrong">Wrong</span>
                )}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="at-next-row">
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              isLoading={isSubmitting}
              fullWidth
            >
              {qIndex >= total - 1 ? 'Submit Assignment' : 'Next Question'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentTake;
