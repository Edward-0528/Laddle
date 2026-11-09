# 01 — Reliability & Real-Time Audit

Scope: socket event lifecycles, disconnect/reconnect, server restarts, races, abuse, transport, scaling.
Files read: `server/src/index.ts`, `server/src/services/gameManager.ts`, `server/src/types/events.ts`, `server/src/validators/schemas.ts`, `server/src/middleware/rateLimit.ts`, `src/services/socket.ts`, `src/pages/Game.tsx`, `src/pages/JoinGame.tsx`, `src/pages/Dashboard.tsx`, `src/types/events.ts`, `render.yaml`.
No source code was modified.

Severity: **P0** breaks a live class session for many people or is easy to exploit. **P1** hurts individuals or scoring, or leaves an exploitable gap. **P2** is hardening or polish.
Effort: **S** < half a day, **M** 1–3 days, **L** a week or more.

---

## 0. Summary of the current model

- **Identity is `socket.id`.** Players are stored under `game.players[socket.id]` (gameManager.ts:194). There is no player token anywhere, and `src/` never touches `localStorage` or `sessionStorage`.
- **Reconnect matches on name only.** `reconnectPlayer(code, newSocketId, name)` finds the first player with that name who is marked `!connected` (gameManager.ts:643). It only runs when the user goes back to `/join` and retypes the code and name. The client never rejoins on its own.
- **Host reconnect** is `host:reconnect {code}` with no secret (index.ts:589). It only works if the server has already marked the host as disconnected (gameManager.ts:546).
- **All state lives in one process's memory**: the `games` record (gameManager.ts:100) plus three timer maps (index.ts:310–312). Nothing is saved anywhere.
- **The client timer** counts down from `durationSec` once it receives `game:question`, after a 400 ms transition delay (Game.tsx:202–210). It ignores the `endsAt` field the server sends.

---

## 1. Player disconnects mid-game

### R1. Players never rejoin automatically after any socket reconnect — **P0** · M
**Failure scenario.** A phone locks, wifi drops, or the app is backgrounded. socket.io-client reconnects with a **new socket id**. The server still holds the player under the old id, now marked `connected:false` (gameManager.ts:455). The new socket is not in the room, and nothing in `Game.tsx` sends `player:join` again: the `connect` handler at Game.tsx:188–192 only handles the host. So the player gets no more questions and their screen freezes. Any `player:answer` that socket.io buffered while offline is sent from the new socket id and silently rejected (gameManager.ts:293).

**Tab refresh is worse.** On mount, Game.tsx:312 sends `lobby:request`, and the server then runs `socket.join(code)` without creating a player record (index.ts:502). The refreshed tab now receives every `game:question` and looks fully alive. But every answer is rejected silently: there is no ack and no error. The player believes they are playing and scores zero.

**Fix: a stable player token plus a resume handshake.**
1. In `addPlayer` (gameManager.ts:178), generate `playerId = crypto.randomUUID()` and `token = crypto.randomBytes(16).toString('base64url')`. Key players by `playerId`, not socket id. Keep two maps: `socketIndex: Map<socketId, {code, playerId|'host'}>` and `game.tokens: Record<token, playerId>`.
2. Return `{ok, playerId, token}` in the `player:join` callback (index.ts:407). On the client, save it in JoinGame.tsx:55 as `localStorage['ladle:session:'+code] = {token, name, role:'player', ts}`.
3. Add a `session:resume {code, token}` event. The client sends it from Game.tsx on mount **and** on every `connect`. The server re-binds the socket, joins the room, and replies with a snapshot (see R4).
```ts
socket.on('session:resume', (p, cb) => {
  const { code, token } = ResumeSchema.parse(p);
  const g = getGame(code); const pid = g?.tokens[token];
  if (!g || !pid) return cb({ ok:false, reason:'expired' });
  const pl = g.players[pid];
  if (pl.socketId && pl.socketId !== socket.id) io.sockets.sockets.get(pl.socketId)?.disconnect(true); // newest tab wins
  pl.socketId = socket.id; pl.connected = true; pl.disconnectedAt = undefined;
  socketIndex.set(socket.id, { code, playerId: pid });
  socket.join(code);
  cb({ ok:true, snapshot: buildPlayerSnapshot(g, pid) });
  io.to(code).emit(EVENTS.LOBBY_UPDATE, publicPlayerList(g));
});
```
4. Remove `socket.join` from `lobby:request` (index.ts:502). Only a resumed or joined socket should be placed in the room.

### R2. A fast reconnect can't take its slot back because the server still thinks the old socket is connected — **P0** · S (included in R1)
**Failure scenario.** After a short wifi blip, the client reconnects in 1–5 s. The server only notices the old socket is dead after `pingInterval` plus `pingTimeout`, about 45 s with the defaults. Meanwhile `reconnectPlayer` requires `!p.connected` (gameManager.ts:644), so it fails. The request falls through to `addPlayer`, which returns "This game has already started." (gameManager.ts:188). The player is locked out of their own game.
**Fix.** A valid token always takes over the slot, whatever the `connected` flag says, and the old socket is disconnected (see the R1 sketch). The late `disconnect` from the old socket must check `socketIndex.get(oldId)` and do nothing if the slot has already been rebound.

### R3. Anyone can take over a disconnected player by typing their name — **P1** · S (fixed by R1)
**Failure scenario.** "Sam" disconnects. Anyone with the code joins as "Sam" and inherits Sam's score, streak and any pending answer (gameManager.ts:643–660). If two players share a name, the first disconnected match wins, so scores can be swapped.
**Fix.** Reconnect only with a token. Keep name matching only as a fallback that the host must approve, if at all.

### R4. A reconnecting player gets no state snapshot — **P1** · M
**Failure scenario.** A player who rejoins through `/join` gets only `player:reconnected` (index.ts:379). `Game.tsx` starts in `lobby` and shows "Game Lobby / Waiting for host" in the middle of a question. `game:question:end` then arrives with `currentQuestion === null`, so the reveal branch at Game.tsx:461 is skipped and the lobby is shown again. The server keeps the player's answer (gameManager.ts:652), but the client doesn't know it was given, so the buttons are active again and a second answer is silently rejected.
**Fix.** `buildPlayerSnapshot` returns `{state, paused, question (no answerIndex), remainingMs, serverNow, myAnswer: choiceIndex|null, score, streak, teamName, lastResult?, finalResults?}`. Add a `hydrate(snapshot)` reducer in Game.tsx that sets every relevant piece of state.

### R5. Disconnected players are deleted after 90–150 s and lose their score — **P1** · S
**Failure scenario.** `RECONNECT_WINDOW_MS = 90_000` (gameManager.ts:667), and the cleanup runs every 60 s (index.ts:772), so the real window is 90–150 s. A student whose phone locks for 3 minutes is removed from `players`. Their score disappears from the final leaderboard and Firestore history. Rejoining is refused because the game has started.
**Fix.** Never delete players during a game. Mark them `left:true`, keep them on leaderboards (perhaps greyed out), and exclude them only from the "all answered" count (R14). Let tokens resume until the game ends. Delete records only when the whole game is removed.

### R6. Refreshing in the lobby drops the player — **P1** · S
**Failure scenario.** In the lobby, a disconnect deletes the player immediately (gameManager.ts:465). After a refresh, the client is placed back in the room through `lobby:request` without being a player (R1). When the game starts it receives questions, but every answer is rejected.
**Fix.** Use the same `connected:false` grace logic in every state, plus token resume. The R1 fix covers this.

---

## 2. Host disconnects

### R7. Refreshing or briefly disconnecting in the lobby destroys the game for everyone — **P0** · S
**Failure scenario.** The teacher has 30 students in the lobby, then accidentally refreshes or the laptop sleeps. `handleDisconnect` sees `state === 'lobby'` and runs `delete games[code]` (gameManager.ts:435–445). index.ts:576 sends `game:ended`, and every student lands on an empty "Final Results" screen. `reconnectHost` then fails because the game no longer exists.
**Fix.** Treat the lobby like any other state: `hostConnected=false` plus the abandon timer. Use a longer grace period in the lobby, such as 5 minutes, because no clock is running.

### R8. The host can't reconnect after a short blip, and the game is then abandoned — **P0** · S
**Failure scenario.** This is the same stale-connection race as R2, but for the host. The laptop's wifi blips, the client reconnects in about 2 s, and Game.tsx:190 sends `host:reconnect`. `reconnectHost` returns `{ok:false}` because `hostConnected` is still `true` (gameManager.ts:546). The server replies `host:reconnect:failed`, and **no client code listens for it**. About 45 s later the old socket times out. `handleDisconnect` marks the host as away, players see the "host disconnected" banner, and 90 s after that `abandonGame` ends the game for everyone (index.ts:564–573). The connected host never retries.
**Fix.** Issue a `hostToken` on `host:create`, returned in the callback at index.ts:352 and stored in `localStorage['ladle:session:'+code]`. A valid token always takes over: set `hostSocketId`, disconnect the old socket, and clear the abandon timer. The client should listen for `host:reconnect:failed` and show "This game is no longer available" with a link back to the dashboard.

### R9. Anyone who knows the code can become host while the host is away — **P0 (security)** · S
**Failure scenario.** Every student knows the code. While `hostConnected=false`, any socket that sends `host:reconnect {code}` becomes host (index.ts:589–593, gameManager.ts:540–551). They can then skip questions, pause, add `extraSeconds: 1e9`, or end the game, and they receive the host snapshot.
**Fix.** Require the `hostToken` from R8. Better still, also check a Firebase ID token sent in the socket handshake (`io.use` middleware with `verifyIdToken`) and confirm `uid === game.hostUid`.

### R10. Host refresh may never trigger `host:reconnect` — **P1** · S
**Failure scenario.** The socket is created when the module is imported (socket.ts:11). If it connects before `Game` mounts and registers its `connect` listener (Game.tsx:188), the reconnect is never sent. Host status after a refresh also depends only on `?host=true` in the URL (Game.tsx:306). Also, `socket.off('connect')` in the cleanup at Game.tsx:329 removes **every** `connect` listener, including the logger at socket.ts:21 and the `once('connect')` handlers in Dashboard.tsx:142–149.
**Fix.** On mount, run `if (socket.connected) resume(); socket.on('connect', resume)`. In the cleanup, call `socket.off('connect', resume)` with the specific handler, and do the same for every `off` call. Base the role on the stored session token, not the URL parameter.

### R11. The host snapshot ignores the reveal and results states, and the visible "Start Quiz" button can skip questions — **P1** · S
**Failure scenario.** `game:state` is only applied when `state === 'question'` (Game.tsx:175). A host who reconnects during `reveal` or `results` sees the **lobby** with an enabled "Start Quiz" button. `host:start` has no state check (index.ts:450–453), so clicking it calls `startNextQuestion` while the reveal timer is still pending. One question is shown and then immediately replaced, which skips a question and runs two timer chains. The same thing happens when the host double-clicks Start in the lobby: the rate limit allows 5 starts per minute (rateLimit.ts:84).
**Fix.** Add `if (game.state !== 'lobby') return;` in `host:start`. Include `lastResult` and `finalResults` in the snapshot and handle every state in the client's hydrate step.

### R12. Results are lost when the game finishes or is abandoned while the host is away — **P1** · S
**Failure scenario.** Question and reveal timers keep running without the host (index.ts:731, 760), so the quiz can finish while the host is gone. `game:results` is sent to a room the host is not in. Only the host's client saves to Firestore (Game.tsx:257), so the game history is lost. If the 90 s timer ends the game instead, players get `game:ended` and see a podium built from the last reveal, and nothing is saved.
**Fix.** (a) Automatically pause the current question when the host disconnects (call `pauseGame` and clear the timer), so the class waits. (b) Store `finalResults` on the game and include them in the host snapshot. (c) Save results **on the server** with firebase-admin, which is already a dependency (index.ts:256), not from the host's browser.

### R13. The abandon path deletes timer handles without clearing them — **P2** · S
index.ts:569–570 and the `host:end` handler (index.ts:548) remove the game but never call `clearTimeout` on the question or reveal timers. They fire against a missing game, which is harmless today. If a new game ever reused the same code, stale timers would act on it.
**Fix.** Add one `destroyGame(code)` helper that clears all three timer maps and then deletes the game. Use it everywhere.

---

## 3. Server restart / Render sleep / deploy

### R14. Every restart wipes all games, and clients hang with no message — **P0** · M (MVP) / L (full)
**Failure scenario.** `render.yaml` uses `plan: free`. Free instances spin down after 15 minutes without inbound traffic and take about 30–60 s or more to cold start. Every deploy or crash restarts the process. All of the following live only in memory: `games` (gameManager.ts:100), the timers (index.ts:310), and the rate-limit store. After a restart:
- The host client reconnects and sends `host:reconnect`. The server replies `host:reconnect:failed`, which nothing handles (R8), so the host is stuck.
- Players reconnect and are in no room. They stay frozen forever.
- `reconnectionAttempts: 10` with `reconnectionDelayMax: 5000` (socket.ts:14–16) gives up after roughly 45 s, which can be shorter than a cold start. After that the tab never reconnects.
- There is no `SIGTERM` handler, so a deploy cuts every game off without warning.

**Fix, minimal viable version (about 2 days, needs R1 and R8 tokens):**
1. **Snapshot each game to Redis** (Upstash free tier with `ioredis`) after every state change: create, join, question start, answer (debounced about 250 ms), finalize, pause, resume, extend, end. Use `SET game:{code} <json> EX 14400`. The game object is already plain JSON once players are keyed by `playerId` and socket ids are left out. Firestore also works (`liveGames/{code}`, with answers written in batches at finalize). It is slower but needs no new vendor.
2. **Rehydrate on boot.** Run `SCAN game:*`, load each game, mark everyone `connected:false`, and re-arm timers:
```ts
for (const g of await loadAllGames()) {
  games[g.code] = g;
  if (g.state === 'question' && !g.paused) {
    const ms = g.questionEndsAt! - Date.now();
    armQuestionTimer(g.code, g.currentQuestionIndex, Math.max(ms, 0) + 500);
  } else if (g.state === 'reveal') armRevealTimer(g.code, 5000);
  startHostAbandonTimer(g.code, 5 * 60_000); // give the host time to come back
}
```
3. **Graceful shutdown.** On `SIGTERM`: flush snapshots, send `server:restarting`, then `io.close()`.
4. **Client changes.** Set `reconnectionAttempts: Infinity`. Show a "Reconnecting…" overlay that listens on `socket.io.on('reconnect_attempt')`, the Manager-level event (see R25). Send `session:resume` on every `connect`.
5. **Ops.** Move to Render Starter ($7/mo, no sleep) before any paid or school pilot. Until then, warm the server when the Dashboard loads: `fetch(SOCKET_URL + '/ping')`. The `/ping` endpoint exists (index.ts:158) but nothing calls it.

**Full version.** Use the Redis adapter and distributed timers (see §8).

---

## 4. Names, joining, limits

### R15. No duplicate-name check — **P1** · S
`addPlayer` never checks names (gameManager.ts:194). The client uses names as React keys and map keys in `key={entry.name}` and `animatedScores[entry.name]` (Game.tsx:233, 511, 539). It also matches student progress by name (Game.tsx:273), so two players called "Sam" get mixed up in the UI and saved to the wrong records.
**Fix.** Normalize names (`name.normalize('NFKC').trim().toLowerCase()`, remove zero-width and bidi control characters). Reject duplicates with "Name taken", or add a suffix like "Sam (2)". Use `playerId` as the key in leaderboard payloads.

### R16. Empty or invisible names get through validation — **P1** · S
`JoinGameSchema` checks `min(1)` **before** `sanitize`, so `"<b></b>"` becomes `""` and is accepted (schemas.ts:54). Names made of only zero-width or RTL-override characters also pass.
**Fix.** Use `z.string().max(30).transform(clean).pipe(z.string().min(1).max(20).regex(/\p{L}|\p{N}/u))`.

### R17. No profanity filter and no way for the host to kick a player — **P1** · M
This is a classroom product. A student can join as a slur or as "Teacher", and the host has no way to remove them.
**Fix.** Add a `host:kick {code, playerId}` event: remove the player, ban the token or IP for this game, send `player:kicked`. Add a server-side profanity filter such as the `obscenity` npm package. Optionally add a host setting to use generated nicknames.

### R18. Late joiners are refused, and the player cap counts ghost slots — **P2** · S
`addPlayer` rejects anyone once the state is not `lobby` (gameManager.ts:187). Kahoot allows late joining. `MAX_PLAYERS_PER_GAME = 50` counts disconnected and left slots (gameManager.ts:190).
**Fix.** Add an `allowLateJoin` option (late joiners start at 0 points and join from the next question). Count only connected players toward the cap. Move the cap into config and tie it to the pricing plan.

### R19. The team assignment is lost on join, and `host:set-teams` input is not validated — **P2** · S
`game:role` with `teamName` is sent while the client is still on JoinGame (index.ts:397). Game.tsx registers its listener only after navigation, so `myTeamName` is never set. `lobby:request` does not resend `lobby:teams`. `host:set-teams` accepts any array with no length or type checks and no rate limit (index.ts:414–419).
**Fix.** Include team info in the join callback and the snapshot. Add a zod schema allowing 2–8 names of at most 30 characters each.

---

## 5. Race conditions and timing

### R20. Client and server timers disagree, so answers in the last ~1 s are silently dropped — **P1** · M
**Failure scenario.** The server sets `endsAt = now + duration` (gameManager.ts:258) and accepts answers only until `endsAt`, with no grace period (gameManager.ts:297). The client starts counting from `durationSec` after network latency plus a 400 ms transition delay (Game.tsx:202–210). It still shows 1–2 seconds left after the server has closed the question. On a backgrounded or throttled phone, the `setTimeout` chain (Game.tsx:340) can be many seconds off. Rejected answers get **no reply**, so the UI shows the choice as selected but never "locked in". The reveal then marks it wrong.
**Fix.**
- Have the server send `remainingMs` and `serverNow` with every question, resume and snapshot message. The client estimates clock offset with a ping: `socket.timeout(3000).emit('time:sync', t0, (serverNow) => offset = serverNow - (t0 + rtt/2))`. It computes `deadline = endsAt - offset`, and the display reads `Math.ceil((deadline - Date.now())/1000)` on a 250 ms interval, not a chain of decrements.
- On the server, accept answers until `endsAt + 750 ms`, and fire the end timer at `endsAt + 750`.
- Always reply to an answer: `player:answer` gets a callback `{ok:true, choiceIndex}` or `{ok:false, reason:'late'|'already'|'not_in_game'}`.

### R21. Answers during a pause, and after "+30s", earn inflated points (score exploit) — **P1** · S
**Failure scenario.** `recordAnswer` does not check `game.paused` (gameManager.ts:291–297), and `questionEndsAt` stays in the future while paused. When the host resumes, `questionEndsAt` is reset to `now + remaining` (gameManager.ts:510). Scoring uses `endsAt - answeredAt` (gameManager.ts:354). An answer given at the start of a 5-minute pause therefore gets `timeRemaining ≈ 300 s`, and `speedScore = 300000/20000*1000 = 15000` points. There is no clamp. "+30s" (gameManager.ts:531) also raises every earlier answer's remaining time, and can push scores above 1000.
**Fix.** Reject answers while paused. Record the remaining time **at the moment of answering**, then score with a clamp:
```ts
const remainingAtAnswer = game.questionEndsAt! - now;            // in recordAnswer
game.answers[pid] = { ..., remainingMs: remainingAtAnswer };
// finalize:
const frac = Math.min(1, Math.max(0, a.remainingMs / (game.questionTotalMs)));  // totalMs includes extensions
const speedScore = Math.round(500 + 500 * frac);                 // or the current 0..1000, but clamped
```

### R22. A double tap or quick change of mind leaves the UI showing a different answer than the server recorded — **P1** · S
`hasAnswered` only turns true when the ack arrives (Game.tsx:301), so a second tap before then sends again (Game.tsx:350–352). The server keeps the **first** answer, but `selectedChoice` shows the second.
**Fix.** Set a local `submitting` lock on the first tap. The ack callback returns the recorded `choiceIndex`, and the UI shows that value.

### R23. The early end ("everyone has answered") never fires once one player drops — **P2** · S
index.ts:483 counts every player, including disconnected ones. One phone that locks means everyone waits out the full timer. The host bar compares the answer count against `players.length`, which counts connected players only, so it can show "5 / 4".
**Fix.** Count only connected, non-left players. Recheck the early end when a player disconnects, too.

### R24. `host:extend-time` input is not validated — **P2** · S
`Number(extraSeconds) || 30` (index.ts:668) accepts negative values or values like 1e9. A `setTimeout` longer than 2^31 ms fires **immediately** in Node, which ends the question at once. Pause, resume and extend also have no zod schema and no rate limit.
**Fix.** Use `z.object({code, extraSeconds: z.number().int().min(5).max(120)})`. Cap total extensions at, for example, 5 minutes.

Minor: Game.tsx:143 ignores `timeRemainingMs` when paused, so the paused display can be wrong. Resume sets `totalTime = remaining` (Game.tsx:151), which resets the progress ring to full.

---

## 6. Game codes, abuse, cleanup

### R25. Anyone can fill all 100 game slots and lock everyone out — **P1** · S
`MAX_ACTIVE_GAMES = 100` (gameManager.ts:82). `host:create` needs no auth and is limited to 3 per minute **per socket** (rateLimit.ts:78). New sockets cost nothing, so a short script fills the server, and every real teacher sees "Server is at capacity."
**Fix.** Require a Firebase ID token in the socket handshake to host (the Dashboard already sits behind auth). Allow at most 2 live games per uid. Add per-IP connection limits, but keep them generous, because a whole school shares one NAT address.

### R26. Rate limits are per socket and `lobby:request` has none — **P2** · S
Every rate limit resets on reconnect (key `${socketId}:${event}`, rateLimit.ts:41). `lobby:request` has no limit and no validation, returns the full player list, and joins the room (index.ts:495–504). That makes it a free oracle for guessing codes and a way to silently watch any game. The code space is 32^6 ≈ 1.07e9, so guessing is unlikely to succeed, but it costs nothing to try.
**Fix.** Rate-limit by IP plus event. Have `lobby:request` require a session (R1). Generate codes with `crypto.randomInt` instead of `Math.random` (gameManager.ts:113).

### R27. Some games are never cleaned up — **P1** · S
`cleanupIdleGames` only removes **lobby** games with **zero players** that are older than 1 hour (gameManager.ts:705–708). Games that are never deleted:
- Games in `results` while the host tab stays open (a projector left on), because nothing removes finished games.
- Lobby games that have players but an idle host.
- Extra games when a host creates several (for example, the Quick Launch "Cancel" button in Dashboard.tsx:184 leaves a game behind). `handleDisconnect` uses `.find` (gameManager.ts:424), so it only handles the **first** game linked to that socket. The same applies to a player socket that is in two games.

**Fix.** Use the `socketIndex` map (which also replaces the O(games) scan on every disconnect) and handle every game linked to the socket. Add a `lastActivityAt` field and remove any game that has been inactive for 30 minutes, and any game more than 15 minutes after `results`, whatever its state.

---

## 7. Transport and client socket settings

### R28. Socket.IO Connection State Recovery is not enabled (cheap interim fix) — **P1** · S
On a single instance, `new Server(server, { connectionStateRecovery: { maxDisconnectionDuration: 2*60_000, skipMiddlewares: true } })` brings back the **same socket id**, its rooms and any missed events after short drops. That alone fixes most phone-lock and wifi-blip cases for both players and host, without the token work. Handle `socket.recovered === true` by setting `connected=true` again. It does **not** cover page refreshes or server restarts, so R1 and R8 are still needed.

### R29. Client reconnection settings and listeners are wrong — **P1** · S
- `reconnectionAttempts: 10` (socket.ts:14): change it to `Infinity` (see R14).
- In Socket.IO v4, `reconnect`, `reconnect_attempt` and `reconnect_failed` are **Manager** events, so `socket.on('reconnect', …)` at socket.ts:33–43 never fires. Use `socket.io.on('reconnect_attempt', …)`.
- The UI never reacts to a disconnect. Add a global connection-status store and a "Reconnecting…" banner.
- `JoinGame` has no timeout, so the spinner runs forever while Render is asleep. Use `socket.timeout(15000).emit('player:join', …, (err, res) => …)`.
- When the app returns to the foreground (`visibilitychange` → visible), if the socket is connected, send `session:resume` to resync. If it is not, call `socket.connect()`.

### R30. Polling fallback, CORS and multiple tabs — **P2** · S
- Polling then upgrading to WebSocket is the default and fine on one instance. If more instances are added, use sticky sessions or `transports: ['websocket']` (see §8).
- The CORS list is hardcoded (index.ts:80–100), so Netlify deploy previews fail. Socket CORS does not stop non-browser clients, so authentication must come from tokens.
- Two tabs in one browser are two sockets and two players. With tokens kept in `localStorage` per game code, the "newest tab wins" rule (R1 sketch) kicks the older tab with `session:replaced`.
- `?host=true` lets any student see the host UI. The server rejects the actions, but such a tab with a logged-in user would still run `saveGameResult` (Game.tsx:257). Server-side saving (R12c) removes this.

---

## 8. Scaling

### R31. The server is limited to a single instance — **P2 now / P1 at growth** · L
State, timers, rate limits and `io.to(code)` broadcasts all assume one process. The real limits today are 100 games × 50 players, or 5,000 sockets. Render free gives 512 MB and a fraction of a CPU, so event-loop lag will also make timers fire late. One properly sized Node process (1 vCPU) can comfortably handle about 5–10k idle sockets in this kind of workload. **Recommendation: stay on one instance, upgrade it vertically, and add Redis snapshots (R14) first.** When horizontal scaling becomes necessary:
1. Add `@socket.io/redis-adapter` so room broadcasts reach every node.
2. Use sticky sessions (Render has no cookie stickiness, so use `transports:['websocket']` to remove the polling requirement), or Fly.io / a load balancer with affinity.
3. Choose one owner per game: route by hashing the code, or acquire `SET lock:game:{code} nodeId NX PX 10000` with a heartbeat. Only the owner runs timers. Alternatively, move timers to BullMQ delayed jobs.
4. Keep game state in Redis as the source of truth, and update it with `WATCH` or Lua for answers.
Add metrics now (active games, sockets, event-loop lag via `perf_hooks.monitorEventLoopDelay`, reconnect counts) so the time to scale is visible in data.

---

## 9. Prioritized plan

| # | Item | Sev | Effort |
|---|------|-----|--------|
| 1 | Player and host session tokens + `session:resume` + snapshot (R1, R2, R3, R4, R6, R8, R9, R10) | P0 | M |
| 2 | Keep lobby games alive when the host disconnects (R7) | P0 | S |
| 3 | `connectionStateRecovery` + `reconnectionAttempts: Infinity` + Manager events + reconnect UI (R28, R29) | P1 | S |
| 4 | Score clamp, no answers while paused, record remaining time per answer (R21) | P1 | S |
| 5 | Server-authoritative timer with `remainingMs`/offset + 750 ms grace + answer ack/nack + submit lock (R20, R22) | P1 | M |
| 6 | `host:start` state guard; snapshot covers all states (R11) | P1 | S |
| 7 | Redis snapshot + rehydrate + SIGTERM handling; Render Starter plan (R14) | P0 | M |
| 8 | Auth required to host + per-uid game cap (R25) | P1 | S |
| 9 | Unique, normalized names; kick; profanity filter (R15, R16, R17) | P1 | M |
| 10 | Never delete players mid-game; early end counts connected players only (R5, R23) | P1 | S |
| 11 | Auto-pause on host away; save results on the server (R12) | P1 | S |
| 12 | `destroyGame` helper, `socketIndex`, activity-based cleanup (R13, R27) | P1 | S |
| 13 | Zod for pause/extend/teams; per-IP limits; crypto codes (R19, R24, R26) | P2 | S |
| 14 | Horizontal scaling (R31) | P2 | L |
