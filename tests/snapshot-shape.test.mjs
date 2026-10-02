import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slim } from '../scripts/snapshot-shape.mjs';

const repo = { name: 'demo', full_name: 'me/demo', description: null, html_url: 'https://github.com/me/demo',
  homepage: '', has_pages: false, owner: { login: 'me' }, language: 'HTML', pushed_at: '2026-10-01T00:00:00Z',
  private: false, open_issues_count: 2 };

// GitHub lists runs newest first
const run = (name, n, conclusion = 'success', status = 'completed') => ({
  name, status, conclusion, updated_at: `2026-10-01T00:${String(59 - n).padStart(2, '0')}:00Z`,
  html_url: `https://github.com/me/demo/actions/runs/${name}-${n}`, event: 'schedule' });

test('keeps one entry per workflow, described by its newest run', () => {
  const out = slim(repo, [], [run('Deploy', 0, 'failure'), run('CI', 0), run('Deploy', 1)]);
  assert.deepEqual(out.workflows.map(w => w.name), ['Deploy', 'CI']);
  const deploy = out.workflows[0];
  assert.equal(deploy.concl, 'failure');
  assert.equal(deploy.status, 'completed');
  assert.equal(deploy.url, 'https://github.com/me/demo/actions/runs/Deploy-0');
  assert.equal(deploy.event, 'schedule');
  assert.equal(deploy.date, '2026-10-01T00:59:00Z');
});

test('each workflow carries its recent runs, newest first', () => {
  const out = slim(repo, [], [run('CI', 0, 'failure'), run('Deploy', 0), run('CI', 1), run('CI', 2, null, 'in_progress')]);
  const ci = out.workflows.find(w => w.name === 'CI');
  assert.deepEqual(ci.runs, [
    { status: 'completed', concl: 'failure', date: '2026-10-01T00:59:00Z', url: 'https://github.com/me/demo/actions/runs/CI-0', event: 'schedule' },
    { status: 'completed', concl: 'success', date: '2026-10-01T00:58:00Z', url: 'https://github.com/me/demo/actions/runs/CI-1', event: 'schedule' },
    { status: 'in_progress', concl: null, date: '2026-10-01T00:57:00Z', url: 'https://github.com/me/demo/actions/runs/CI-2', event: 'schedule' },
  ]);
  assert.equal(out.workflows.find(w => w.name === 'Deploy').runs.length, 1);
});

test('recent runs are capped at five per workflow', () => {
  const out = slim(repo, [], [...Array(8)].map((_, n) => run('CI', n)));
  const ci = out.workflows[0];
  assert.equal(ci.runs.length, 5);
  assert.equal(ci.runs[4].url, 'https://github.com/me/demo/actions/runs/CI-4');
});

test('a repo with no runs has no workflows', () => {
  assert.deepEqual(slim(repo, [], []).workflows, []);
});
