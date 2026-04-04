/**
 * Client-side password reset tokens (demo / no backend).
 * Production: replace with server-issued tokens and email delivery.
 */
const STORAGE_KEY = "eduzah-pw-reset-tokens";
const TTL_MS = 60 * 60 * 1000; // 1 hour

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function createResetToken(email) {
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const store = load();
  store[token] = { email: email.trim().toLowerCase(), exp: Date.now() + TTL_MS };
  save(store);
  return token;
}

/** Returns email if token is valid; does not consume. */
export function getValidResetEmail(token) {
  if (!token) return null;
  const store = load();
  const row = store[token];
  if (!row || Date.now() > row.exp) {
    if (row) {
      delete store[token];
      save(store);
    }
    return null;
  }
  return row.email;
}

export function invalidateResetToken(token) {
  const store = load();
  if (store[token]) {
    delete store[token];
    save(store);
  }
}
