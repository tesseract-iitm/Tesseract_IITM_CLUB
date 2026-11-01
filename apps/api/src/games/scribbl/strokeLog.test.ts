import assert from 'node:assert/strict';
import test from 'node:test';
import { appendToStrokeLog, type LoggedStroke } from './strokeLog.js';

const stroke = (n: number): LoggedStroke => ({ from: { x: n, y: n }, to: { x: n + 1, y: n + 1 }, color: 'red', size: 4 });

test('appends in order', () => {
  const log = appendToStrokeLog([stroke(0)], [stroke(1), stroke(2)]);
  assert.deepEqual(log.map((s) => s.from.x), [0, 1, 2]);
});

test('keeps only the newest segments past the cap', () => {
  const log = appendToStrokeLog([stroke(0), stroke(1), stroke(2)], [stroke(3), stroke(4)], 3);
  assert.deepEqual(log.map((s) => s.from.x), [2, 3, 4]);
});

test('does not modify the input log', () => {
  const original = [stroke(0)];
  appendToStrokeLog(original, [stroke(1)]);
  assert.equal(original.length, 1);
});
