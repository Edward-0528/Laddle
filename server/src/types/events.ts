// ---------------------------------------------------------------------------
// Socket Event Names — Single Source of Truth (server)
//
// Mirror of src/types/events.ts on the client side.
// Keep both files in sync — see client file for rationale.
// ---------------------------------------------------------------------------

export const EVENTS = {
  // ---- Client → Server ----
  HOST_CREATE:   'host:create',
  HOST_START:    'host:start',
  PLAYER_JOIN:   'player:join',
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
