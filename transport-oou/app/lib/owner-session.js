export const OWNER_EMAIL = 'fikayo009@gmail.com';
const TRUST_KEY = 'toou_owner_trusted_session';
const TRUST_WINDOW_MS = 24 * 60 * 60 * 1000;

function parse(value) {
  try { return JSON.parse(value || 'null'); } catch { return null; }
}

export function persistOwnerTrustedSession(session) {
  if (typeof window === 'undefined') return;
  if (!session?.access_token || String(session.user?.email || '').toLowerCase() !== OWNER_EMAIL) return;
  const previous = parse(localStorage.getItem(TRUST_KEY));
  const now = Date.now();
  const trustedUntil = previous?.trusted_until > now ? previous.trusted_until : now + TRUST_WINDOW_MS;
  localStorage.setItem(TRUST_KEY, JSON.stringify({
    session,
    issued_at: previous?.issued_at || now,
    trusted_until: trustedUntil
  }));
}

export async function restoreOwnerTrustedSession(api, apiKey) {
  if (typeof window === 'undefined') return null;
  const stored = parse(localStorage.getItem(TRUST_KEY));
  if (!stored?.session || !stored.trusted_until || stored.trusted_until <= Date.now()) {
    if (stored) localStorage.removeItem(TRUST_KEY);
    return null;
  }

  let session = stored.session;
  const baseHeaders = {
    apikey: apiKey,
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  };
  if (!session.refresh_token || !session.access_token) return null;

  if (!session.expires_at || session.expires_at * 1000 <= Date.now() + 90000) {
    const refreshed = await api('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    session = { ...refreshed, user: refreshed.user || session.user };
  }

  const user = await api('/auth/v1/user', {
    headers: { ...baseHeaders, Authorization: 'Bearer ' + session.access_token }
  });
  if (String(user?.email || '').toLowerCase() !== OWNER_EMAIL) {
    localStorage.removeItem(TRUST_KEY);
    return null;
  }
  session = { ...session, user };
  localStorage.setItem(TRUST_KEY, JSON.stringify({
    session,
    issued_at: stored.issued_at,
    trusted_until: stored.trusted_until
  }));
  return session;
}
