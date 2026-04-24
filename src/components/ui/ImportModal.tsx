// ---------------------------------------------------------------------------
// ImportModal
// Two-tab modal for importing questions from pasted text or an Excel/CSV
// file. Shows a parsed preview that the user can review and selectively
// include before merging into the QuizBuilder state.
// ---------------------------------------------------------------------------

import React, { useState, useRef, useCallback } from 'react';
import Button from './Button';
import { parseText, parseFile, toQuizQuestion, type ParsedQuestion } from '../../services/quizImport';
import type { QuizQuestion } from '../../types/quiz';
import './ImportModal.css';

type Tab = 'text' | 'file';

interface Props {
  onImport: (questions: QuizQuestion[]) => void;
  onClose: () => void;
}

const ImportModal: React.FC<Props> = ({ onImport, onClose }) => {
  const [tab, setTab] = useState<Tab>('text');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestion[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // Parse handlers
  // --------------------------------------------------------------------------

  async function handleParseText() {
    if (!rawText.trim()) {
      setParseError('Please paste some text first.');
      return;
    }
    setIsParsing(true);
    setParseError('');
    try {
      const result = parseText(rawText);
      if (result.questions.length === 0) {
        setParseError(
          'No questions detected. Make sure your text has a recognisable format — see the hint above.'
        );
        return;
      }
      setParsed(result.questions);
      setSkipped(result.skipped);
      setIncluded(new Set(result.questions.map((q) => q._importId)));
    } catch {
      setParseError('An error occurred while parsing. Please check your text and try again.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleParseFile(file: File) {
    setIsParsing(true);
    setParseError('');
    try {
      const result = await parseFile(file);
      if (result.questions.length === 0) {
        setParseError(
          'No questions found in the file. Make sure your spreadsheet has the expected column headers.'
        );
        return;
      }
      setParsed(result.questions);
      setSkipped(result.skipped);
      setIncluded(new Set(result.questions.map((q) => q._importId)));
    } catch {
      setParseError('Could not read the file. Make sure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsParsing(false);
    }
  }

  // --------------------------------------------------------------------------
  // File drag / drop
  // --------------------------------------------------------------------------

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
        handleParseFile(file);
      }
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleParseFile(file);
    }
  };

  // --------------------------------------------------------------------------
  // Preview controls
  // --------------------------------------------------------------------------

  function toggleIncluded(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleImport() {
    if (!parsed) return;
    const selected = parsed.filter((q) => included.has(q._importId));
    onImport(selected.map(toQuizQuestion));
    onClose();
  }

  // --------------------------------------------------------------------------
  // Template CSV download
  // --------------------------------------------------------------------------

  function downloadTemplate() {
    const csv = [
      'Question,Answer A,Answer B,Answer C,Answer D,Correct',
      'What is the capital of France?,London,Paris,Berlin,Rome,B',
      'Is the sun a star?,True,False,,,A',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const selectedCount = included.size;

  return (
    <div className="import-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">

        {/* Header */}
        <div className="import-modal-header">
          <h2 className="import-modal-title" id="import-modal-title">Import Questions</h2>
          <button className="import-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="import-modal-tabs">
          <button
            className={`import-tab-btn ${tab === 'text' ? 'active' : ''}`}
            onClick={() => { setTab('text'); setParsed(null); setParseError(''); }}
          >
            Paste Text
          </button>
          <button
            className={`import-tab-btn ${tab === 'file' ? 'active' : ''}`}
            onClick={() => { setTab('file'); setParsed(null); setParseError(''); }}
          >
            Upload File
          </button>
        </div>

        {/* Body */}
        <div className="import-modal-body">

          {/* ---- Text tab ---- */}
          {tab === 'text' && !parsed && (
            <>
              <p className="import-hint">
                Paste questions from an AI tool or any text source. Each question should be
                separated by a blank line. Mark the correct answer with <code>*</code>,{' '}
                <code>(correct)</code>, or a trailing <code>Answer: B</code> line.
                True/False questions are detected automatically.
              </p>
              <textarea
                className="import-textarea"
                placeholder={`Example:\n\n1. What is the capital of France?\nA) London\nB) Paris*\nC) Berlin\nD) Rome\n\nIs the sun a star?\nTrue (correct)\nFalse`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                spellCheck={false}
              />
              {parseError && <p className="import-error">{parseError}</p>}
              <Button
                variant="primary"
                size="md"
                onClick={handleParseText}
                isLoading={isParsing}
                className="import-parse-btn"
              >
                Parse Questions
              </Button>
            </>
          )}

          {/* ---- File tab ---- */}
          {tab === 'file' && !parsed && (
            <>
              <p className="import-hint">
                Upload a <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code> file.
                Required columns: <code>Question</code>, <code>Answer A</code>, <code>Answer B</code>,
                and <code>Correct</code> (A / B / C / D or the answer text).
                Columns C and D are optional.
              </p>
              <div
                className={`import-dropzone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <div className="import-dropzone-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p>Drop your file here or click to browse</p>
                <span>.xlsx, .xls, .csv accepted</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                />
              </div>
              {selectedFile && !isParsing && !parseError && (
                <p className="import-file-selected">Selected: {selectedFile.name}</p>
              )}
              {isParsing && <p className="import-file-selected">Parsing file...</p>}
              {parseError && <p className="import-error">{parseError}</p>}
              <p className="import-template-link">
                <a onClick={downloadTemplate} href="#" role="button">
                  Download CSV template
                </a>
              </p>
            </>
          )}

          {/* ---- Preview (both tabs share this) ---- */}
          {parsed && (
            <div className="import-preview">
              <div className="import-preview-header">
                <h3>Review Parsed Questions</h3>
                <span className="import-preview-meta">
                  {parsed.length} detected
                  {skipped > 0 ? `, ${skipped} skipped` : ''}
                  {' — '}
                  {selectedCount} selected
                </span>
              </div>

              <div className="import-preview-list">
                {parsed.map((q, i) => (
                  <div
                    key={q._importId}
                    className={`import-q-card ${q._confidence === 'low' ? 'low-confidence' : ''} ${!included.has(q._importId) ? 'excluded' : ''}`}
                  >
                    <div className="import-q-top">
                      <input
                        type="checkbox"
                        className="import-q-checkbox"
                        checked={included.has(q._importId)}
                        onChange={() => toggleIncluded(q._importId)}
                        id={`import-q-${i}`}
                      />
                      <label className="import-q-text" htmlFor={`import-q-${i}`}>
                        {q.text}
                      </label>
                      <span className={`import-q-type-badge ${q.questionType === 'true-false' ? 'badge-tf' : 'badge-mc'}`}>
                        {q.questionType === 'true-false' ? 'T / F' : 'MC'}
                      </span>
                    </div>

                    <div className="import-q-choices">
                      {q.choices.map((c, ci) => (
                        <div
                          key={ci}
                          className={`import-q-choice ${ci === q.correctAnswerIndex ? 'correct' : ''}`}
                        >
                          <span className="import-q-choice-marker">
                            {String.fromCharCode(65 + ci)}
                          </span>
                          {c}
                        </div>
                      ))}
                    </div>

                    {q._warnings.length > 0 && (
                      <div className="import-q-warnings">
                        {q._warnings.map((w, wi) => (
                          <p key={wi} className="import-q-warning">Warning: {w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {parseError && <p className="import-error">{parseError}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="import-modal-footer">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          {parsed && (
            <Button
              variant="primary"
              size="md"
              onClick={handleImport}
              disabled={selectedCount === 0}
            >
              Add {selectedCount} Question{selectedCount !== 1 ? 's' : ''}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ImportModal;
