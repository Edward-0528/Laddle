// ---------------------------------------------------------------------------
// Socket Event Names — Single Source of Truth (client)
//
// All socket.io event name strings live here. Both the Game component and
// this file import from this const, so a rename is always a one-line change
// and a typo produces a TypeScript error rather than a silent runtime bug.
//
// The server-side mirror lives at server/src/types/events.ts.
// Both files must stay in sync — they are intentionally kept as two copies
// (rather than a shared package) to avoid coupling the build toolchains.
// ---------------------------------------------------------------------------

export const EVENTS = {
  // ---- Client → Server ----
  HOST_CREATE: 'host:create',
  HOST_START:  'host:start',
  PLAYER_JOIN: 'player:join',
  PLAYER_ANSWER: 'player:answer',
  LOBBY_REQUEST: 'lobby:request',

  // ---- Server → Client ----
  GAME_ROLE:         'game:role',
  GAME_QUESTION:     'game:question',
  GAME_QUESTION_END: 'game:question:end',
  GAME_ANSWER_COUNT: 'game:answer:count',
  GAME_RESULTS:      'game:results',
  GAME_ENDED:        'game:ended',
  LOBBY_UPDATE:      'lobby:update',
  PLAYER_ANSWER_ACK: 'player:answer:ack',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
