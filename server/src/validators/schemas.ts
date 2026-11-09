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
/**
 * A game code: 4-8 letters/digits, normalised to upper case. Rejects anything
 * else (e.g. "constructor", "__proto__") before it can reach a lookup.
 */
export const CodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,8}$/, 'Invalid game code');

/** Opaque reconnect secrets handed to hosts and players. */
export const TokenSchema = z.string().regex(/^[a-f0-9]{32}$/);

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

/** The 20 sticker avatars a player can pick (see docs/AVATARS.md). */
export const AVATAR_KINDS = [
  'goose', 'tomato', 'pickle', 'donut', 'cactus', 'toast', 'avocado', 'cloud', 'banana', 'taco',
  'snail', 'waffle', 'broccoli', 'moon', 'cupcake', 'penguin', 'jelly', 'egg', 'lemon', 'frog',
] as const;

/**
 * Schema for the player:join event payload.
 * Player names are sanitized and limited to 30 characters.
 * Game codes are uppercased and limited to 8 characters.
 */
export const JoinGameSchema = z.object({
  code: CodeSchema,
  name: z.string().trim().min(1).max(30).transform(sanitize).refine((v) => v.length > 0, 'Name required'),
  avatar: z.enum(AVATAR_KINDS).optional(),
});

/**
 * Schema for the host:start event payload.
 */
export const StartGameSchema = z.object({
  code: CodeSchema,
});

/**
 * Schema for the player:answer event payload.
 * The choiceIndex must be a non-negative integer.
 */
export const AnswerSchema = z.object({
  code: CodeSchema,
  choiceIndex: z.number().int().min(0).max(5),
});

/**
 * Schema for host:skip and host:end events — just requires the game code.
 */
export const GameActionSchema = z.object({
  code: CodeSchema,
});

/** host:reconnect: the host proves who they are with the token from host:create. */
export const HostReconnectSchema = z.object({
  code: CodeSchema,
  hostToken: TokenSchema,
});

/** session:resume: a player returns after a refresh or network drop. */
export const PlayerResumeSchema = z.object({
  code: CodeSchema,
  playerToken: TokenSchema,
});

/** host:extend-time: only positive, bounded extensions. */
export const ExtendTimeSchema = z.object({
  code: CodeSchema,
  extraSeconds: z.number().int().min(5).max(120).default(30),
});

/** host:set-teams: 2-8 short team names. */
export const SetTeamsSchema = z.object({
  code: CodeSchema,
  teamNames: z.array(z.string().trim().min(1).max(20).transform(sanitize)).min(2).max(8),
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
