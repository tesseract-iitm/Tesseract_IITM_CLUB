import assert from 'node:assert/strict';
import test from 'node:test';
import { DRAWER_BONUS_POINTS, drawerBonusByUser } from './scoring.js';

test('awards the bonus once per correct guess', () => {
  const bonuses = drawerBonusByUser([
    { drawerId: 'a', guesses: [{ correct: true }, { correct: true }, { correct: false }] },
  ]);
  assert.equal(bonuses.get('a'), 2 * DRAWER_BONUS_POINTS);
});

test('adds up the bonus across several rounds of the same drawer', () => {
  const bonuses = drawerBonusByUser([
    { drawerId: 'a', guesses: [{ correct: true }] },
    { drawerId: 'b', guesses: [{ correct: true }, { correct: true }] },
    { drawerId: 'a', guesses: [{ correct: true }] },
  ]);
  assert.equal(bonuses.get('a'), 2 * DRAWER_BONUS_POINTS);
  assert.equal(bonuses.get('b'), 2 * DRAWER_BONUS_POINTS);
});

test('gives nothing for a round nobody solved', () => {
  const bonuses = drawerBonusByUser([{ drawerId: 'a', guesses: [{ correct: false }] }]);
  assert.equal(bonuses.has('a'), false);
});
