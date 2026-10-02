import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRepos, upsertBody, sessionFrom } from '../admin-logic.mjs';

const rows = (...r) => r.map(([name, visible]) => ({ name, visible }));

test('every public repo is listed, switched off unless the list says otherwise', () => {
  const out = mergeRepos(['alpha', 'beta', 'gamma'], rows(['alpha', true], ['beta', false]));
  assert.deepEqual(out.map(r => [r.name, r.visible]), [['alpha', true], ['beta', false], ['gamma', false]]);
});

test('the dashboard repo itself is never offered', () => {
  assert.deepEqual(mergeRepos(['agent-hq', 'alpha'], []).map(r => r.name), ['alpha']);
});

test('a repo on the list that is no longer public is still shown, marked as gone', () => {
  const out = mergeRepos(['alpha'], rows(['alpha', true], ['old-repo', true]));
  const old = out.find(r => r.name === 'old-repo');
  assert.deepEqual([old.visible, old.gone], [true, true]);
  assert.equal(out.find(r => r.name === 'alpha').gone, false);
});

test('the list is sorted by name, ignoring case, and is stable', () => {
  const names = ['beta', 'Alpha', 'calculator', 'AEEG', 'alpha-2'];
  const a = mergeRepos(names, []).map(r => r.name);
  assert.deepEqual(a, ['AEEG', 'Alpha', 'alpha-2', 'beta', 'calculator']);
  assert.deepEqual(mergeRepos([...names].reverse(), []).map(r => r.name), a);
});

test('only an explicit true counts as on', () => {
  const out = mergeRepos(['a', 'b', 'c'], [{ name: 'a', visible: true }, { name: 'b', visible: 'true' }, { name: 'c', visible: null }]);
  assert.deepEqual(out.map(r => r.visible), [true, false, false]);
});

test('switching a repo writes exactly its name, its new state and the time', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  assert.deepEqual(upsertBody('alpha', true, now), { name: 'alpha', visible: true, updated_at: '2026-10-02T12:00:00.000Z' });
  assert.deepEqual(upsertBody('alpha', false, now).visible, false);
});

test('a sign-in response becomes a session and one without a token is refused', () => {
  const now = 1_000_000;
  const s = sessionFrom({ access_token: 'a', refresh_token: 'r', expires_in: 3600, user: { email: 'me@example.com' } }, now);
  assert.deepEqual(s, { accessToken: 'a', refreshToken: 'r', expiresAt: now + 3600_000, email: 'me@example.com' });
  assert.equal(sessionFrom({ error: 'invalid_grant' }, now), null);
  assert.equal(sessionFrom(null, now), null);
});
