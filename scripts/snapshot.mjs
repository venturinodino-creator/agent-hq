// Agent HQ snapshot — run by .github/workflows/snapshot.yml every hour.
// Uses the GITHUB_TOKEN that GitHub Actions provides automatically (nothing to create or paste).
// Writes data.json, which index.html reads instead of calling the GitHub API from your browser.
import { readFileSync, writeFileSync } from 'node:fs';
import { slim } from './snapshot-shape.mjs';
import { applyVisibility } from './visibility.mjs';

const USER  = process.env.HQ_USER || process.env.GITHUB_REPOSITORY_OWNER;
const SELF  = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || 'agent-hq';
const DAY   = 864e5;
const H = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (process.env.GITHUB_TOKEN) H.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function gh(path) {
  const r = await fetch('https://api.github.com' + path, { headers: H });
  if (r.status === 404 || r.status === 409) return null;   // empty repo, Actions disabled, …
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

// Which repos the owner has switched ON. Asked through a small function in Supabase that anyone may call with
// the public key (see supabase.json); it returns only the names that are ON, which this dashboard publishes
// anyway, so a repo that is OFF is never named here. No secret is needed, so none is stored in this repo.
async function visibleNames() {
  const { url, publishableKey } = JSON.parse(readFileSync(new URL('../supabase.json', import.meta.url), 'utf8'));
  const r = await fetch(`${url}/rest/v1/rpc/agent_hq_visible_repos`, {
    method: 'POST', headers: { apikey: publishableKey, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error(`visibility list → HTTP ${r.status}`);
  return r.json();
}

// Fail closed: if the list cannot be read or is not a plain list of names, this throws before data.json is
// written, so the previous snapshot stays in place instead of every repo being published.
const all = (await gh(`/users/${USER}/repos?per_page=100&sort=pushed&type=owner`)).filter(r => r.name !== SELF);
const list = applyVisibility(all, await visibleNames());
console.log(`Visibility: ${list.length} of ${all.length} repos switched on`);

const since = new Date(Date.now() - 56 * DAY).toISOString();
const repos = [];
for (const r of list) {
  const active = (Date.now() - new Date(r.pushed_at)) / DAY <= 60;
  const commits = active ? (await gh(`/repos/${r.full_name}/commits?per_page=100&since=${since}`)) || [] : [];
  const runs    = active ? (await gh(`/repos/${r.full_name}/actions/runs?per_page=100`))?.workflow_runs || [] : [];
  repos.push(slim(r, commits, runs));
}

writeFileSync('data.json', JSON.stringify({ generatedAt: new Date().toISOString(), user: USER, repos }));
console.log(`Snapshot: ${repos.length} repos, ${repos.reduce((n, r) => n + r.commits.length, 0)} commits`);
