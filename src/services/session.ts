// ---------------------------------------------------------------------------
// Game session secrets
// The server hands the host a hostToken and each player a playerToken. They
// are kept in localStorage per game code so a refresh, a locked phone or a
// dropped Wi-Fi connection puts people straight back where they were.
// ---------------------------------------------------------------------------

const HOST_KEY = (code: string) => `ladle.hostToken.${code}`;
const PLAYER_KEY = (code: string) => `ladle.playerToken.${code}`;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* private mode: the game still works, just without resume */ }
}

export const getHostToken = (code: string) => read(HOST_KEY(code));
export const saveHostToken = (code: string, token: string) => write(HOST_KEY(code), token);
export const clearHostToken = (code: string) => write(HOST_KEY(code), null);

export const getPlayerToken = (code: string) => read(PLAYER_KEY(code));
export const savePlayerToken = (code: string, token: string) => write(PLAYER_KEY(code), token);
export const clearPlayerToken = (code: string) => write(PLAYER_KEY(code), null);
