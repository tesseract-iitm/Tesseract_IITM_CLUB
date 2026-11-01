import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVoteSelection } from './pollVote.js';

const pollOptionIds = ['a', 'b', 'c'];

test('accepts a single valid option on a single-choice poll', () => {
  const result = validateVoteSelection({ requestedOptionIds: ['a'], pollOptionIds, allowMultipleChoices: false });
  assert.deepEqual(result, { ok: true, optionIds: ['a'] });
});

test('deduplicates repeated option ids', () => {
  const result = validateVoteSelection({ requestedOptionIds: ['a', 'a'], pollOptionIds, allowMultipleChoices: false });
  assert.deepEqual(result, { ok: true, optionIds: ['a'] });
});

test('rejects several options on a single-choice poll', () => {
  const result = validateVoteSelection({ requestedOptionIds: ['a', 'b'], pollOptionIds, allowMultipleChoices: false });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 'BAD_REQUEST');
});

test('accepts several options on a multiple-choice poll', () => {
  const result = validateVoteSelection({ requestedOptionIds: ['a', 'c'], pollOptionIds, allowMultipleChoices: true });
  assert.deepEqual(result, { ok: true, optionIds: ['a', 'c'] });
});

test('rejects option ids that do not belong to the poll', () => {
  const result = validateVoteSelection({ requestedOptionIds: ['a', 'zzz'], pollOptionIds, allowMultipleChoices: true });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.message, 'One or more selected options are invalid');
});

test('rejects votes on a question-only poll with a conflict', () => {
  const result = validateVoteSelection({ requestedOptionIds: ['a'], pollOptionIds: [], allowMultipleChoices: false });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 'CONFLICT');
});
