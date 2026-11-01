import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { retryOnUniqueViolation } from './retryOnUniqueViolation.js';

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

test('returns the result without retrying when the operation succeeds', async () => {
  let calls = 0;
  const result = await retryOnUniqueViolation(async () => {
    calls += 1;
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('retries after a unique violation and returns the later result', async () => {
  let calls = 0;
  const result = await retryOnUniqueViolation(async () => {
    calls += 1;
    if (calls === 1) throw uniqueViolation();
    return 'second-attempt';
  });
  assert.equal(result, 'second-attempt');
  assert.equal(calls, 2);
});

test('gives up and rethrows after the maximum number of attempts', async () => {
  let calls = 0;
  await assert.rejects(
    retryOnUniqueViolation(async () => {
      calls += 1;
      throw uniqueViolation();
    }, 3),
    (error: unknown) => (error as { code?: string }).code === 'P2002',
  );
  assert.equal(calls, 3);
});

test('does not retry errors that are not unique violations', async () => {
  let calls = 0;
  await assert.rejects(
    retryOnUniqueViolation(async () => {
      calls += 1;
      throw new Error('boom');
    }),
    /boom/,
  );
  assert.equal(calls, 1);
});
