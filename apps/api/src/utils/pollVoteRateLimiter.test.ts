import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { createPollVoteRateLimiter } from './pollVoteRateLimiter.js';

async function withServer(max: number, run: (post: (userId: string) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.use((req, _res, next) => {
    (req as unknown as { authUser: { id: string } }).authUser = { id: String(req.header('x-user')) };
    next();
  });
  app.post('/vote', createPollVoteRateLimiter({ windowMs: 60_000, max }), (_req, res) => {
    res.json({ success: true });
  });

  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  try {
    await run((userId) => fetch(`http://127.0.0.1:${port}/vote`, { method: 'POST', headers: { 'x-user': userId } }));
  } finally {
    server.close();
  }
}

test('rejects votes beyond the limit with 429', async () => {
  await withServer(3, async (post) => {
    for (let i = 0; i < 3; i += 1) assert.equal((await post('user-a')).status, 200);
    const blocked = await post('user-a');
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { success: boolean; error: { message: string } };
    assert.equal(body.success, false);
    assert.match(body.error.message, /Too many vote attempts/);
  });
});

test('counts each user separately', async () => {
  await withServer(1, async (post) => {
    assert.equal((await post('user-a')).status, 200);
    assert.equal((await post('user-a')).status, 429);
    assert.equal((await post('user-b')).status, 200);
  });
});
