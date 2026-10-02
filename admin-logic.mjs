// The parts of the admin page that need no browser: merging the repo list and shaping what is sent to Supabase.
const OWN_REPO = 'agent-hq';   // the dashboard itself is never shown on the dashboard

// githubNames: the owner's public repos. rows: what the visibility table holds. Anything not switched
// on is off, so a brand-new repo starts hidden.
export function mergeRepos(githubNames, rows) {
  const on = new Map(rows.map(r => [r.name, r.visible === true]));
  const onGithub = new Set(githubNames);
  const names = new Set([...githubNames, ...rows.map(r => r.name)]);
  names.delete(OWN_REPO);
  return [...names]
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) || (a < b ? -1 : 1))
    .map(name => ({ name, visible: on.get(name) === true, gone: !onGithub.has(name) }));
}

export const upsertBody = (name, visible, now = new Date()) => ({ name, visible, updated_at: now.toISOString() });

// Turns a Supabase sign-in or refresh response into the session the page keeps, or null when it is not one.
export function sessionFrom(res, now = Date.now()) {
  if (!res || typeof res.access_token !== 'string' || typeof res.refresh_token !== 'string') return null;
  return { accessToken: res.access_token, refreshToken: res.refresh_token, expiresAt: now + (res.expires_in || 3600) * 1000, email: res.user?.email || '' };
}
