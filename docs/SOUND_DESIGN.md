# Sound design

PopPop is played in loud rooms (pubs, parties, living rooms) with one shared
big screen and a phone per player. Sound follows that split.

## Principles

- **The big screen is the show.** The TV speakers carry music, the countdown
  and the big moments, so the whole room hears the same thing at once.
- **Phones are personal and quiet.** Thirty phones beeping in unison is noise,
  so phones only make short, private feedback sounds (plus vibration on
  Android) and play at a lower volume.
- **Never punishing.** No harsh buzzers: a wrong answer is a soft "bwomp",
  time-up is a cheeky honk. Bright, bubbly, sticker-like.
- **No files.** Every sound is synthesized with the Web Audio API in
  `src/services/sound/`, so there is nothing to license, download or cache,
  and it works offline once the page is loaded.
- **Always optional.** Sound and music toggles are on every host screen and in
  the phone lobby, and are remembered per device (`ladle.sound`).

## Moments

| Moment | Big screen (host) | Phone (player) |
|---|---|---|
| Lobby | Relaxed looping groove | – |
| Player joins | Pop, pitched per player | Pop on your own join |
| Question starts | Swoosh + slap, "thinking" music | Light tap |
| Last 5 seconds | Woodblock ticks (higher for 3-2-1), busier music | Ticks for 3-2-1 if you haven't answered |
| Tap an answer | – | Squish + short vibration |
| Answer locked | – | Two-step click |
| Time up | Honk | – |
| Reveal | Stamp + sparkle | Rising chime (right) or soft bwomp (wrong), with vibration |
| Leaderboard | Swoosh + ratchet, a "hop" for each climber | – |
| Pause / resume | Down / up boop | Down / up boop |
| Final podium | Building drum roll, fanfare, confetti sparkle | Placement jingle (fanfare for 1st) |

## Browser rules

Browsers block audio until the user taps the page. The host tapped "Host now"
to get there, so the big screen is usually unlocked. If the host reloads the
lobby, a bouncing **Tap for sound** chip appears next to the sound buttons.

## Code map

- `services/sound/engine.ts`: audio context, buses, settings, unlock, building blocks
- `services/sound/sfx.ts`: the effects
- `services/sound/music.ts`: step-sequenced lobby and question loops
- `hooks/useGameSounds.ts`: maps game state changes to sounds
- `components/sticker/SoundToggle.tsx`: sound / music buttons
