// Admin page: sign in, then switch repos on and off. Talks to Supabase with plain fetch and no libraries,
// so there is no third-party script on a page that handles a password. The session lives in
// sessionStorage, so closing the tab signs you out.
import { mergeRepos, upsertBody, sessionFrom } from './admin-logic.mjs';

const OWNER = 'venturinodino-creator', TABLE = 'agent_hq_repo_visibility', SESSION_KEY = 'hq.admin.session';
const $ = s => document.querySelector(s);
let cfg = null, session = null, repos = [];

const saved = {
  get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } },
  set(s) { try { s ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESSION_KEY); } catch { /* storage blocked: the session just won't survive a reload */ } },
};

async function authCall(path, body) {
  const r = await fetch(`${cfg.url}/auth/v1/${path}`, { method: 'POST', body: JSON.stringify(body),
    headers: { apikey: cfg.publishableKey, 'Content-Type': 'application/json' } });
  return r.json().catch(() => null);
}

async function refreshSession() {
  const s = sessionFrom(await authCall('token?grant_type=refresh_token', { refresh_token: session.refreshToken }));
  if (!s) throw new Error('Your session has expired. Please sign in again.');
  session = { ...s, email: s.email || session.email }; saved.set(session);
}

// A call to the database as the signed-in owner; refreshes the session once if it has run out.
async function api(path, init = {}) {
  if (session.expiresAt - Date.now() < 60e3) await refreshSession();
  const call = () => fetch(`${cfg.url}/rest/v1/${path}`, { ...init,
    headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...init.headers } });
  let r = await call();
  if (r.status === 401) { await refreshSession(); r = await call(); }
  return r;
}

function show(signedIn) { $('#login').hidden = signedIn; $('#panel').hidden = !signedIn; }

function signOut(message = '') {
  session = null; saved.set(null); repos = [];
  $('#repos').replaceChildren(); $('#count').textContent = ''; $('#who').textContent = '';
  $('#password').value = ''; $('#loginErr').textContent = message; show(false);
}

async function githubNames() {
  try {
    const r = await fetch(`https://api.github.com/users/${OWNER}/repos?per_page=100&type=owner`);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()).map(x => x.name);
  } catch { $('#panelErr').textContent = 'Could not read your repo list from GitHub, so only repos already on the list are shown.'; return []; }
}

async function load() {
  $('#panelErr').textContent = '';
  $('#who').textContent = 'Signed in as ' + (session.email || 'owner');
  const names = await githubNames();
  const r = await api(`${TABLE}?select=name,visible`);
  if (!r.ok) throw new Error(`Could not read the list (HTTP ${r.status}).`);
  repos = mergeRepos(names, await r.json());
  draw();
}

function draw() {
  const on = repos.filter(r => r.visible).length;
  $('#count').textContent = `${on} of ${repos.length} repos are on.`;
  const list = $('#repos'); list.replaceChildren();
  for (const repo of repos) {
    const li = document.createElement('li'), name = document.createElement('span'), sw = document.createElement('button');
    name.className = 'name'; name.textContent = repo.name;
    if (repo.gone) { const s = document.createElement('small'); s.textContent = 'no longer public on GitHub'; name.append(s); }
    sw.className = 'sw'; sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(repo.visible));
    sw.setAttribute('aria-label', `${repo.name} on the dashboard`); sw.textContent = repo.visible ? 'ON' : 'OFF';
    sw.onclick = () => toggle(repo, sw);
    li.append(name, sw); list.append(li);
  }
}

async function toggle(repo, button) {
  const next = !repo.visible;
  button.disabled = true; $('#panelErr').textContent = '';
  try {
    const r = await api(`${TABLE}?on_conflict=name`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(upsertBody(repo.name, next)) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    repo.visible = next;
  } catch (e) { $('#panelErr').textContent = `Could not save ${repo.name} (${e.message}). Nothing was changed.`; }
  draw();
}

$('#login').addEventListener('submit', async e => {
  e.preventDefault();
  $('#loginErr').textContent = ''; $('#signin').disabled = true;
  try {
    const res = await authCall('token?grant_type=password', { email: $('#email').value.trim(), password: $('#password').value });
    const s = sessionFrom(res);
    if (!s) throw new Error(res?.error_description || res?.msg || 'Sign-in failed.');
    session = s; saved.set(s); $('#password').value = ''; show(true); await load();
  } catch (err) { signOut(err.message); }
  $('#signin').disabled = false;
});
$('#signout').addEventListener('click', () => signOut());

(async () => {
  try { cfg = await (await fetch('supabase.json')).json(); }
  catch { $('#loginErr').textContent = 'Could not load the settings file.'; show(false); return; }
  session = saved.get();
  if (!session) { show(false); return; }
  show(true);
  try { await load(); } catch (err) { signOut(err.message); }
})();
