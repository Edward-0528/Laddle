// ---------------------------------------------------------------------------
// AIGenerateModal
// Small overlay in QuizBuilder that collects topic / grade / count and
// calls the server to generate questions via Gemini.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import './AIGenerateModal.css';

interface Props {
  onGenerate: (topic: string, gradeLevel: string, count: number) => Promise<void>;
  onClose: () => void;
}

const GRADE_LEVELS = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9 (Freshman)', 'Grade 10 (Sophomore)',
  'Grade 11 (Junior)', 'Grade 12 (Senior)',
  'College / University',
  'Adult / General',
];

const AIGenerateModal: React.FC<Props> = ({ onGenerate, onClose }) => {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 6');
  const [count, setCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await onGenerate(topic.trim(), gradeLevel, count);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" role="dialog" aria-modal="true" aria-label="Generate questions with AI" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h2 className="ai-modal-title">Generate with AI</h2>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <p className="ai-modal-subtitle">
          Powered by <strong>Gemini 2.5 Flash-Lite</strong>. Questions will be added to your quiz for review — edit anything before saving.
        </p>

        <form className="ai-modal-form" onSubmit={handleSubmit}>
          <Input
            label="Topic"
            placeholder='e.g. "The American Civil War" or "Photosynthesis"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            fullWidth
            disabled={isLoading}
          />

          <div className="ai-modal-row">
            <div className="ai-modal-field">
              <label className="ai-modal-label">Grade Level</label>
              <select
                className="ai-modal-select"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                disabled={isLoading}
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="ai-modal-field">
              <label className="ai-modal-label">Number of Questions</label>
              <div className="ai-count-control">
                <button
                  type="button"
                  className="ai-count-btn"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  disabled={isLoading || count <= 1}
                  aria-label="Decrease"
                >−</button>
                <span className="ai-count-value">{count}</span>
                <button
                  type="button"
                  className="ai-count-btn"
                  onClick={() => setCount((c) => Math.min(10, c + 1))}
                  disabled={isLoading || count >= 10}
                  aria-label="Increase"
                >+</button>
              </div>
              <span className="ai-count-hint">max 10</span>
            </div>
          </div>

          {error && <p className="ai-modal-error">{error}</p>}

          <div className="ai-modal-actions">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
              {isLoading ? 'Generating…' : `Generate ${count} Question${count !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIGenerateModal;
