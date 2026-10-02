import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVisibility } from '../scripts/visibility.mjs';

const repos = [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }];
const names = list => applyVisibility(repos, list).map(r => r.name);

test('only repos on the visible list are shown', () => {
  assert.deepEqual(names(['alpha', 'gamma']), ['alpha', 'gamma']);
});

test('a repo that is not on the list is hidden', () => {
  assert.deepEqual(names(['beta']), ['beta']);
});

test('an empty list hides everything', () => {
  assert.deepEqual(names([]), []);
});

test('names on the list that match no repo are ignored', () => {
  assert.deepEqual(names(['alpha', 'deleted-repo']), ['alpha']);
});

test('names must match exactly, including case', () => {
  assert.deepEqual(names(['Alpha', 'BETA']), []);
});

test('anything other than a list of names is refused rather than guessed at', () => {
  for (const bad of [null, undefined, 'alpha', { alpha: true }, [1, 2], [null], [['alpha']]]) {
    assert.throws(() => applyVisibility(repos, bad), /visible list/, JSON.stringify(bad));
  }
});
