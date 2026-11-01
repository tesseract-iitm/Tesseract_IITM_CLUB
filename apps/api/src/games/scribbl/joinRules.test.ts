import assert from 'node:assert/strict';
import test from 'node:test';
import { canJoinRoom } from './joinRules.js';

test('anyone can join a lobby', () => {
  assert.equal(canJoinRoom('LOBBY', false), true);
  assert.equal(canJoinRoom('LOBBY', true), true);
});

test('a member can rejoin a running game', () => {
  assert.equal(canJoinRoom('ACTIVE', true), true);
});

test('a stranger cannot join a running game', () => {
  assert.equal(canJoinRoom('ACTIVE', false), false);
});

test('nobody can join a finished or aborted room', () => {
  for (const status of ['FINISHED', 'ABORTED'] as const) {
    assert.equal(canJoinRoom(status, true), false);
    assert.equal(canJoinRoom(status, false), false);
  }
});
