import assert from 'node:assert/strict';
import test from 'node:test';
import { isPollClosed, resolveLifecycleChange } from './pollLifecycle.js';

const now = new Date('2026-06-01T12:00:00.000Z');
const past = new Date('2026-05-01T00:00:00.000Z');
const future = new Date('2026-07-01T00:00:00.000Z');

test('a poll without a deadline is open', () => {
  assert.equal(isPollClosed(null, now), false);
});

test('a poll is closed only after its deadline has passed', () => {
  assert.equal(isPollClosed(past, now), true);
  assert.equal(isPollClosed(future, now), false);
});

test('closing an open poll sets the deadline to now', () => {
  assert.deepEqual(resolveLifecycleChange(null, 'close', now), { ok: true, deadline: now });
  assert.deepEqual(resolveLifecycleChange(future, 'close', now), { ok: true, deadline: now });
});

test('closing an already closed poll is rejected', () => {
  const result = resolveLifecycleChange(past, 'close', now);
  assert.equal(result.ok, false);
});

test('reopening a closed poll clears the deadline', () => {
  assert.deepEqual(resolveLifecycleChange(past, 'reopen', now), { ok: true, deadline: null });
});

test('reopening an open poll is rejected', () => {
  assert.equal(resolveLifecycleChange(null, 'reopen', now).ok, false);
  assert.equal(resolveLifecycleChange(future, 'reopen', now).ok, false);
});

test('a poll closed by the helper reads as closed a moment later', () => {
  const change = resolveLifecycleChange(null, 'close', now);
  assert.ok(change.ok && change.deadline);
  assert.equal(isPollClosed(change.deadline, new Date(now.getTime() + 1)), true);
});
