import assert from 'node:assert/strict';
import test from 'node:test';
import { hasEnoughPlayers, pickHost, shouldEndRound } from './roomRules.js';

const member = (userId: string, active = true) => ({ userId, active });

test('round continues while a connected guesser has not solved', () => {
  const members = [member('d'), member('a'), member('b')];
  assert.equal(shouldEndRound({ members, drawerId: 'd', solvedUserIds: new Set(['a']) }), false);
});

test('round ends when every connected guesser has solved', () => {
  const members = [member('d'), member('a'), member('b')];
  assert.equal(shouldEndRound({ members, drawerId: 'd', solvedUserIds: new Set(['a', 'b']) }), true);
});

test('a disconnected guesser does not block the round', () => {
  const members = [member('d'), member('a'), member('b', false)];
  assert.equal(shouldEndRound({ members, drawerId: 'd', solvedUserIds: new Set(['a']) }), true);
});

test('round ends when the drawer has disconnected', () => {
  const members = [member('d', false), member('a'), member('b')];
  assert.equal(shouldEndRound({ members, drawerId: 'd', solvedUserIds: new Set() }), true);
});

test('round ends when fewer than two players remain connected', () => {
  const members = [member('d'), member('a', false)];
  assert.equal(shouldEndRound({ members, drawerId: 'd', solvedUserIds: new Set() }), true);
});

test('host is kept while connected', () => {
  assert.equal(pickHost([member('h'), member('a')], 'h'), 'h');
});

test('host passes to the first connected player when the host leaves', () => {
  assert.equal(pickHost([member('h', false), member('a', false), member('b')], 'h'), 'b');
});

test('no host when nobody is connected', () => {
  assert.equal(pickHost([member('h', false)], 'h'), null);
});

test('two connected players are enough to play', () => {
  assert.equal(hasEnoughPlayers([member('a'), member('b')]), true);
});

test('one connected player is not enough', () => {
  assert.equal(hasEnoughPlayers([member('a'), member('b', false)]), false);
});
