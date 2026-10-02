import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVisibility } from '../scripts/visibility.mjs';

const repos = [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }];

test('only repos that are switched on are shown', () => {
  const { shown } = applyVisibility(repos, [
    { name: 'alpha', visible: true }, { name: 'beta', visible: false }, { name: 'gamma', visible: true }]);
  assert.deepEqual(shown.map(r => r.name), ['alpha', 'gamma']);
});

test('a repo missing from the list is hidden and reported as unknown', () => {
  const { shown, unknown } = applyVisibility(repos, [{ name: 'alpha', visible: true }]);
  assert.deepEqual(shown.map(r => r.name), ['alpha']);
  assert.deepEqual(unknown, ['beta', 'gamma']);
});

test('a repo that is switched off is known, so it is not reported again', () => {
  const { unknown } = applyVisibility(repos, [
    { name: 'alpha', visible: false }, { name: 'beta', visible: false }, { name: 'gamma', visible: false }]);
  assert.deepEqual(unknown, []);
});

test('an empty list hides everything', () => {
  const { shown, unknown } = applyVisibility(repos, []);
  assert.deepEqual(shown, []);
  assert.deepEqual(unknown, ['alpha', 'beta', 'gamma']);
});

test('only a true flag switches a repo on', () => {
  const { shown } = applyVisibility(repos, [
    { name: 'alpha', visible: 'true' }, { name: 'beta', visible: 1 }, { name: 'gamma', visible: null }]);
  assert.deepEqual(shown, []);
});

test('list entries for repos that no longer exist are ignored', () => {
  const { shown, unknown } = applyVisibility([{ name: 'alpha' }], [
    { name: 'alpha', visible: true }, { name: 'deleted-repo', visible: true }]);
  assert.deepEqual(shown.map(r => r.name), ['alpha']);
  assert.deepEqual(unknown, []);
});
