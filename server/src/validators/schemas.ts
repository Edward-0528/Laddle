import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation Schemas
// All incoming socket and REST payloads are validated through these schemas
// before any game logic is executed. This prevents malformed data, XSS
// injection, and out-of-range values from reaching the application layer.
// ---------------------------------------------------------------------------

/**
 * Strips HTML tags and trims whitespace from a string value.
 * Used as a Zod transform to sanitize all user-provided text fields.
 */
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

/**
 * Schema for a single quiz question submitted by the host.
 * Enforces length limits on text and choices, restricts the number of answer
 * options to between 2 and 6, and ensures the correct answer index is valid.
 */
export const QuestionSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(500).transform(sanitize),
  choices: z
    .array(z.string().min(1).max(200).transform(sanitize))
    .min(2)
    .max(6),
  answerIndex: z.number().int().min(0),
  durationSec: z.number().int().min(5).max(120),
  questionType: z.enum(['multiple-choice', 'true-false']).optional(),
}).refine(
  (data) => data.answerIndex < data.choices.length,
  { message: 'answerIndex must be less than the number of choices' }
);

/**
 * Schema for the host:create event payload.
 * Limits a single quiz to 50 questions maximum.
 */
export const CreateGameSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(50),
  quizTitle: z.string().max(200).optional(),
});

/**
 * Schema for the player:join event payload.
 * Player names are sanitized and limited to 30 characters.
 * Game codes are uppercased and limited to 8 characters.
 */
export const JoinGameSchema = z.object({
  code: z.string().min(1).max(8).transform((val) => val.toUpperCase().trim()),
  name: z.string().min(1).max(30).transform(sanitize),
});

/**
 * Schema for the host:start event payload.
 */
export const StartGameSchema = z.object({
  code: z.string().min(1).max(8).transform((val) => val.toUpperCase().trim()),
});

/**
 * Schema for the player:answer event payload.
 * The choiceIndex must be a non-negative integer.
 */
export const AnswerSchema = z.object({
  code: z.string().min(1).max(8).transform((val) => val.toUpperCase().trim()),
  choiceIndex: z.number().int().min(0),
});

/**
 * Schema for host:skip and host:end events — just requires the game code.
 */
export const GameActionSchema = z.object({
  code: z.string().min(1).max(8).transform((val) => val.toUpperCase().trim()),
});

// ---------------------------------------------------------------------------
// Exported Types
// Derived from the Zod schemas so that runtime validation and compile-time
// types are always in sync.
// ---------------------------------------------------------------------------

export type QuestionPayload = z.infer<typeof QuestionSchema>;
export type CreateGamePayload = z.infer<typeof CreateGameSchema>;
export type JoinGamePayload = z.infer<typeof JoinGameSchema>;
export type StartGamePayload = z.infer<typeof StartGameSchema>;
export type GameActionPayload = z.infer<typeof GameActionSchema>;
export type AnswerPayload = z.infer<typeof AnswerSchema>;

// ---------------------------------------------------------------------------
// AI Generation Schema
// ---------------------------------------------------------------------------

export const AIGenerateSchema = z.object({
  topic: z.string().min(1).max(200).transform((v) => v.replace(/<[^>]*>/g, '').trim()),
  gradeLevel: z.string().min(1).max(50).transform((v) => v.replace(/<[^>]*>/g, '').trim()),
  count: z.number().int().min(1).max(10),
});

export type AIGeneratePayload = z.infer<typeof AIGenerateSchema>;
