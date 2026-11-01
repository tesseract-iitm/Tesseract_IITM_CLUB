import assert from 'node:assert/strict';
import test from 'node:test';
import { compactSegments, createStrokeBuffer, type StrokeSegment } from '../src/lib/strokeBuffer.ts';

const style = { color: 'red', size: 6 };

function path(count: number, overrides: Partial<StrokeSegment> = {}): StrokeSegment[] {
  return Array.from({ length: count }, (_, i) => ({
    from: { x: i, y: i },
    to: { x: i + 1, y: i + 1 },
    ...style,
    ...overrides,
  }));
}

function isContinuous(segments: StrokeSegment[]): boolean {
  return segments.every((segment, i) => i === 0 || segment.from.x === segments[i - 1].to.x);
}

test('leaves a short run untouched', () => {
  const segments = path(2);
  assert.deepEqual(compactSegments(segments, 2), segments);
});

test('bounds the segment count and keeps the path continuous and complete', () => {
  const compacted = compactSegments(path(8), 2);
  assert.ok(compacted.length <= 2);
  assert.ok(isContinuous(compacted));
  assert.deepEqual(compacted[0].from, { x: 0, y: 0 });
  assert.deepEqual(compacted[compacted.length - 1].to, { x: 8, y: 8 });
});

test('does not merge segments of different styles', () => {
  const mixed = [...path(3), ...path(3, { color: 'blue' }).map((s) => ({ ...s, from: { x: s.from.x + 3, y: s.from.y + 3 }, to: { x: s.to.x + 3, y: s.to.y + 3 } }))];
  const compacted = compactSegments(mixed, 2);
  assert.deepEqual(compacted.map((s) => s.color), ['red', 'blue']);
});

test('sends buffered segments on the timer as one batch', () => {
  const sent: StrokeSegment[][] = [];
  let scheduled: (() => void) | null = null;
  const buffer = createStrokeBuffer({
    send: (batch) => sent.push(batch),
    maxSegments: 30,
    setTimer: (callback) => {
      scheduled = callback;
      return 1;
    },
    clearTimer: () => {
      scheduled = null;
    },
  });

  path(5).forEach(buffer.add);
  assert.equal(sent.length, 0);
  scheduled!();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].length, 5);
});

test('flush sends the remaining segments immediately and cancels the timer', () => {
  const sent: StrokeSegment[][] = [];
  let cancelled = false;
  const buffer = createStrokeBuffer({
    send: (batch) => sent.push(batch),
    maxSegments: 30,
    setTimer: () => 1,
    clearTimer: () => {
      cancelled = true;
    },
  });

  buffer.add(path(1)[0]);
  buffer.flush();
  assert.equal(sent.length, 1);
  assert.ok(cancelled);
  buffer.flush();
  assert.equal(sent.length, 1);
});

test('every drawn point is represented in the delivered path at 240 Hz', () => {
  const sent: StrokeSegment[][] = [];
  const timers: (() => void)[] = [];
  const buffer = createStrokeBuffer({
    send: (batch) => sent.push(batch),
    setTimer: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimer: () => undefined,
  });

  const drawn = path(479);
  drawn.forEach((segment, i) => {
    buffer.add(segment);
    if ((i + 1) % 8 === 0) timers.pop()?.();
  });
  buffer.flush();

  const delivered = sent.flat();
  assert.ok(isContinuous(delivered));
  assert.deepEqual(delivered[0].from, drawn[0].from);
  assert.deepEqual(delivered[delivered.length - 1].to, drawn[drawn.length - 1].to);
  assert.ok(sent.every((batch) => batch.length <= 2));
});
