import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeStrokeBudget, STROKE_BUCKET_MAX } from './strokeBudget.js';

const full = { tokens: STROKE_BUCKET_MAX, updatedAt: 0 };

test('allows a burst up to the bucket size', () => {
  const result = consumeStrokeBudget(full, STROKE_BUCKET_MAX, 0);
  assert.equal(result.allowed, true);
  assert.equal(result.budget.tokens, 0);
});

test('refuses a batch larger than the remaining budget and keeps the balance', () => {
  const result = consumeStrokeBudget({ tokens: 5, updatedAt: 0 }, 6, 0);
  assert.equal(result.allowed, false);
  assert.equal(result.budget.tokens, 5);
});

test('refills over time', () => {
  const empty = { tokens: 0, updatedAt: 0 };
  assert.equal(consumeStrokeBudget(empty, 45, 400).allowed, false);
  assert.equal(consumeStrokeBudget(empty, 30, 400).allowed, true);
});

test('never refills beyond the bucket size', () => {
  const result = consumeStrokeBudget({ tokens: 80, updatedAt: 0 }, 0, 60_000);
  assert.equal(result.budget.tokens, STROKE_BUCKET_MAX);
});

test('ignores a clock that moves backwards', () => {
  const result = consumeStrokeBudget({ tokens: 10, updatedAt: 5_000 }, 1, 1_000);
  assert.equal(result.allowed, true);
  assert.equal(result.budget.tokens, 9);
});
