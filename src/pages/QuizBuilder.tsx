// ---------------------------------------------------------------------------
// Quiz Builder Page
// A step-by-step wizard for creating or editing quizzes. Supports adding
// multiple questions with four answer choices, setting time limits, and
// saving to Firestore.
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createQuiz, getQuiz, updateQuiz } from '../services/quizzes';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ImportModal from '../components/ui/ImportModal';
import type { QuizQuestion, QuizSettings, QuestionType } from '../types/quiz';
import './QuizBuilder.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'General Knowledge',
  'Science',
  'History',
  'Movies and TV',
  'Music',
  'Sports',
  'Technology',
  'Pop Culture',
];

const DEFAULT_SETTINGS: QuizSettings = {
  questionDuration: 30,
  showLeaderboardAfterEach: true,
  shuffleQuestions: false,
  shuffleChoices: false,
  maxPlayers: 50,
};

function createEmptyQuestion(): QuizQuestion {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    text: '',
    choices: ['', '', '', ''],
    correctAnswerIndex: 0,
    timeLimit: 30,
    questionType: 'multiple-choice',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const QuizBuilder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  // Quiz metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);

  // Questions
  const [questions, setQuestions] = useState<QuizQuestion[]>([createEmptyQuestion()]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(!!editId);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Load existing quiz if editing
  useEffect(() => {
    if (!editId) return;
    loadExistingQuiz(editId);
  }, [editId]);

  async function loadExistingQuiz(id: string) {
    setIsLoadingQuiz(true);
    try {
      const quiz = await getQuiz(id);
      if (!quiz) {
        setError('Quiz not found.');
        setIsLoadingQuiz(false);
        return;
      }
      setTitle(quiz.title);
      setDescription(quiz.description);
      setCategory(quiz.category);
      setIsPublic(quiz.isPublic);
      setSettings(quiz.settings);
      setQuestions(quiz.questions.length > 0 ? quiz.questions : [createEmptyQuestion()]);
    } catch (err) {
      console.error('[Ladle] Failed to load quiz for editing:', err);
      setError('Failed to load quiz. Please try again.');
    } finally {
      setIsLoadingQuiz(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Question Editing Helpers
  // ---------------------------------------------------------------------------

  function updateQuestionField(index: number, field: keyof QuizQuestion, value: unknown) {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function updateChoice(qIndex: number, cIndex: number, value: string) {
    setQuestions((prev) => {
      const updated = [...prev];
      const choices = [...updated[qIndex].choices];
      choices[cIndex] = value;
      updated[qIndex] = { ...updated[qIndex], choices };
      return updated;
    });
  }

  function addChoice(qIndex: number) {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      if (q.choices.length >= 4) return prev;
      updated[qIndex] = { ...q, choices: [...q.choices, ''] };
      return updated;
    });
  }

  function removeChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      if (q.choices.length <= 2) return prev;
      const choices = q.choices.filter((_, i) => i !== cIndex);
      const correctAnswerIndex =
        q.correctAnswerIndex >= choices.length
          ? choices.length - 1
          : q.correctAnswerIndex === cIndex
          ? 0
          : q.correctAnswerIndex > cIndex
          ? q.correctAnswerIndex - 1
          : q.correctAnswerIndex;
      updated[qIndex] = { ...q, choices, correctAnswerIndex };
      return updated;
    });
  }

  function setQuestionType(qIndex: number, type: QuestionType) {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      if (type === 'true-false') {
        updated[qIndex] = {
          ...q,
          questionType: 'true-false',
          choices: ['True', 'False'],
          correctAnswerIndex: 0,
        };
      } else {
        // Switching back to MC: restore to 4 empty choices if was T/F
        const wasLocked = q.questionType === 'true-false';
        updated[qIndex] = {
          ...q,
          questionType: 'multiple-choice',
          choices: wasLocked ? ['', '', '', ''] : q.choices,
          correctAnswerIndex: 0,
        };
      }
      return updated;
    });
  }

  function addQuestion() {
    const newQ = createEmptyQuestion();
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  }

  function handleImportQuestions(imported: QuizQuestion[]) {
    setQuestions((prev) => {
      const merged = [...prev, ...imported];
      return merged;
    });
    setActiveQuestionIndex(questions.length);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (activeQuestionIndex >= questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, questions.length - 2));
    }
  }

  // ---------------------------------------------------------------------------
  // Validation and Save
  // ---------------------------------------------------------------------------

  function validate(): string | null {
    if (!title.trim()) return 'Please enter a quiz title.';
    if (questions.length === 0) return 'Please add at least one question.';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `Question ${i + 1} is missing the question text.`;
      const filledChoices = q.choices.filter((c) => c.trim().length > 0);
      if (filledChoices.length < 2) {
        return `Question ${i + 1} must have at least 2 answer choices.`;
      }
      if (!q.choices[q.correctAnswerIndex]?.trim()) {
        return `The correct answer for question ${i + 1} is empty.`;
      }
    }

    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user) {
      setError('You must be signed in to save a quiz.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      if (editId) {
        await updateQuiz(editId, {
          title: title.trim(),
          description: description.trim(),
          category,
          questions,
          settings,
          isPublic,
        });
        console.log('[Ladle] Quiz updated successfully');
      } else {
        await createQuiz(
          user.uid,
          title.trim(),
          description.trim(),
          category,
          questions,
          settings,
          isPublic
        );
        console.log('[Ladle] Quiz created successfully');
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('[Ladle] Failed to save quiz:', err);
      setError('Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoadingQuiz) {
    return (
      <div className="quiz-builder">
        <div className="container">
          <div className="builder-loading">
            <div className="loading-spinner" />
            <p>Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeQuestion = questions[activeQuestionIndex];

  return (
    <div className="quiz-builder">
      <div className="container">
        <div className="builder-header">
          <h1 className="builder-title">
            {editId ? 'Edit Quiz' : 'Create New Quiz'}
          </h1>
          <div className="builder-header-actions">
            <Button variant="ghost" size="md" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSave} isLoading={isSaving}>
              {editId ? 'Update Quiz' : 'Save Quiz'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="builder-error">
            <p>{error}</p>
            <button className="builder-error-dismiss" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        {/* -------- Quiz Info -------- */}
        <Card variant="default" padding="lg" className="builder-section">
          <h2 className="builder-section-title">Quiz Details</h2>
          <div className="builder-form-grid">
            <Input
              label="Title"
              placeholder="Enter a title for your quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <Input
              label="Description (optional)"
              placeholder="Briefly describe what this quiz is about"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
            <div className="builder-form-row">
              <div className="builder-field">
                <label className="builder-label">Category</label>
                <select
                  className="builder-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="builder-field">
                <label className="builder-label">Time per Question</label>
                <select
                  className="builder-select"
                  value={settings.questionDuration}
                  onChange={(e) =>
                    setSettings({ ...settings, questionDuration: Number(e.target.value) })
                  }
                >
                  {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((s) => (
                    <option key={s} value={s}>{s} seconds</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="builder-checkbox-row">
              <label className="builder-checkbox">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Make this quiz public</span>
              </label>
              <label className="builder-checkbox">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={(e) =>
                    setSettings({ ...settings, shuffleQuestions: e.target.checked })
                  }
                />
                <span>Shuffle question order</span>
              </label>
            </div>
          </div>
        </Card>

        {/* -------- Questions -------- */}
        <Card variant="default" padding="lg" className="builder-section">
          <div className="builder-questions-header">
            <h2 className="builder-section-title">
              Questions ({questions.length})
            </h2>
            <div className="builder-questions-actions">
              <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
                Import
              </Button>
              <Button variant="secondary" size="sm" onClick={addQuestion}>
                Add Question
              </Button>
            </div>
          </div>

          {/* Question tabs */}
          <div className="question-tabs">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`question-tab ${i === activeQuestionIndex ? 'active' : ''}`}
                onClick={() => setActiveQuestionIndex(i)}
              >
                Q{i + 1}
              </button>
            ))}
          </div>

          {/* Active question editor */}
          {activeQuestion && (
            <div className="question-editor">
              <div className="question-editor-header">
                <h3>Question {activeQuestionIndex + 1}</h3>
                {questions.length > 1 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeQuestion(activeQuestionIndex)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {/* Question type toggle */}
              <div className="question-type-row">
                <span className="builder-label">Question Type</span>
                <div className="question-type-toggle">
                  <button
                    className={`type-btn ${(activeQuestion.questionType ?? 'multiple-choice') === 'multiple-choice' ? 'active' : ''}`}
                    onClick={() => setQuestionType(activeQuestionIndex, 'multiple-choice')}
                    type="button"
                  >
                    Multiple Choice
                  </button>
                  <button
                    className={`type-btn ${activeQuestion.questionType === 'true-false' ? 'active' : ''}`}
                    onClick={() => setQuestionType(activeQuestionIndex, 'true-false')}
                    type="button"
                  >
                    True / False
                  </button>
                </div>
              </div>

              <Input
                label="Question Text"
                placeholder="Type your question here"
                value={activeQuestion.text}
                onChange={(e) =>
                  updateQuestionField(activeQuestionIndex, 'text', e.target.value)
                }
                fullWidth
              />

              <div className="choices-section">
                <div className="choices-section-header">
                  <span className="builder-label">Answer Choices</span>
                  {activeQuestion.questionType !== 'true-false' && (
                    <div className="choices-count-actions">
                      {activeQuestion.choices.length < 4 && (
                        <button
                          className="choice-count-btn add"
                          onClick={() => addChoice(activeQuestionIndex)}
                          type="button"
                        >
                          + Add Choice
                        </button>
                      )}
                      <span className="choices-count-label">
                        {activeQuestion.choices.length} of 4
                      </span>
                    </div>
                  )}
                </div>

                <div className="choices-list">
                  {activeQuestion.choices.map((choice, cIndex) => (
                    <div key={cIndex} className="choice-editor">
                      <label className="choice-radio">
                        <input
                          type="radio"
                          name={`correct-${activeQuestionIndex}`}
                          checked={activeQuestion.correctAnswerIndex === cIndex}
                          onChange={() =>
                            updateQuestionField(activeQuestionIndex, 'correctAnswerIndex', cIndex)
                          }
                        />
                        <span className="choice-radio-indicator" />
                      </label>
                      <span className="choice-letter">
                        {String.fromCharCode(65 + cIndex)}
                      </span>
                      {activeQuestion.questionType === 'true-false' ? (
                        <span className="choice-tf-label">{choice}</span>
                      ) : (
                        <Input
                          placeholder={`Choice ${String.fromCharCode(65 + cIndex)}`}
                          value={choice}
                          onChange={(e) => updateChoice(activeQuestionIndex, cIndex, e.target.value)}
                          fullWidth
                        />
                      )}
                      {activeQuestion.questionType !== 'true-false' &&
                        activeQuestion.choices.length > 2 && (
                          <button
                            className="choice-remove-btn"
                            onClick={() => removeChoice(activeQuestionIndex, cIndex)}
                            type="button"
                            aria-label="Remove choice"
                          >
                            &times;
                          </button>
                        )}
                    </div>
                  ))}
                </div>
                <p className="choices-hint">
                  Select the radio button next to the correct answer.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showImportModal && (
        <ImportModal
          onImport={handleImportQuestions}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};

export default QuizBuilder;
