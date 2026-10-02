// Agent HQ snapshot — run by .github/workflows/snapshot.yml every hour.
// Uses the GITHUB_TOKEN that GitHub Actions provides automatically (nothing to create or paste).
// Writes data.json, which index.html reads instead of calling the GitHub API from your browser.
import { writeFileSync } from 'node:fs';
import { slim } from './snapshot-shape.mjs';

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

const list  = await gh(`/users/${USER}/repos?per_page=100&sort=pushed&type=owner`);
const since = new Date(Date.now() - 56 * DAY).toISOString();
const repos = [];
for (const r of list.filter(r => r.name !== SELF)) {
  const active = (Date.now() - new Date(r.pushed_at)) / DAY <= 60;
  const commits = active ? (await gh(`/repos/${r.full_name}/commits?per_page=100&since=${since}`)) || [] : [];
  const runs    = active ? (await gh(`/repos/${r.full_name}/actions/runs?per_page=100`))?.workflow_runs || [] : [];
  repos.push(slim(r, commits, runs));
}

writeFileSync('data.json', JSON.stringify({ generatedAt: new Date().toISOString(), user: USER, repos }));
console.log(`Snapshot: ${repos.length} repos, ${repos.reduce((n, r) => n + r.commits.length, 0)} commits`);
