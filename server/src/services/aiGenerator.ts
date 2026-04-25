// ---------------------------------------------------------------------------
// AI Question Generator
// Uses Google Gemini (gemini-2.5-flash-lite) to generate quiz questions.
// Structured JSON output via responseSchema ensures the model always returns
// a parse-safe array without needing fragile regex extraction.
//
// Cost model (as of April 2026 — gemini-2.5-flash-lite):
//   Input:  $0.10 / 1M tokens
//   Output: $0.40 / 1M tokens
//   A 10-question generation uses ~300 input + ~600 output tokens ≈ $0.00027
// ---------------------------------------------------------------------------

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIQuestion {
  text: string;
  choices: string[];
  correctAnswerIndex: number;
  questionType: 'multiple-choice' | 'true-false';
}

export interface GenerateOptions {
  topic: string;
  gradeLevel: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Gemini client (lazy-initialised so a missing key only throws on first call)
// ---------------------------------------------------------------------------

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY environment variable is not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

// ---------------------------------------------------------------------------
// Response schema (structured output / JSON mode)
// ---------------------------------------------------------------------------

const questionResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: 'The question text' },
      choices: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '3–4 answer choices',
      },
      correctAnswerIndex: {
        type: SchemaType.INTEGER,
        description: 'Zero-based index of the correct choice',
      },
      questionType: {
        type: SchemaType.STRING,
        enum: ['multiple-choice', 'true-false'],
      },
    },
    required: ['text', 'choices', 'correctAnswerIndex', 'questionType'],
  },
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateQuestions(opts: GenerateOptions): Promise<AIQuestion[]> {
  const { topic, gradeLevel, count } = opts;
  const safeCount = Math.min(Math.max(1, count), 10);

  const model = getClient().getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: questionResponseSchema as any,
      temperature: 0.9,
    },
  });

  const prompt = `Generate exactly ${safeCount} quiz questions about "${topic}" suitable for grade level "${gradeLevel}".

Rules:
- Each question must be clear and unambiguous.
- For multiple-choice: provide exactly 4 choices with one correct answer.
- For true-false: use choices ["True", "False"] only.
- correctAnswerIndex is 0-based.
- Do NOT include answer explanations in the choices themselves.
- Vary question difficulty: some easy, some medium, some hard.
- Return ONLY the JSON array, no extra text.`;

  logger.info(`[AI] Generating ${safeCount} questions about "${topic}" for grade "${gradeLevel}"`);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    logger.error('[AI] Failed to parse Gemini response as JSON', { text: text.slice(0, 200) });
    throw new Error('AI returned malformed JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not an array');
  }

  // Validate + sanitize each question
  const questions: AIQuestion[] = parsed
    .filter((q: any) => q && typeof q.text === 'string' && Array.isArray(q.choices))
    .map((q: any) => ({
      text: String(q.text).trim(),
      choices: (q.choices as unknown[]).map((c) => String(c).trim()),
      correctAnswerIndex: Math.min(
        Math.max(0, Number(q.correctAnswerIndex) || 0),
        (q.choices as unknown[]).length - 1
      ),
      questionType: q.questionType === 'true-false' ? 'true-false' : 'multiple-choice',
    }));

  logger.info(`[AI] Generated ${questions.length} questions successfully`);
  return questions;
}
