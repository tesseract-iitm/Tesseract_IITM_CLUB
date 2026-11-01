export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeSegment {
  from: StrokePoint;
  to: StrokePoint;
  color: string;
  size: number;
  erase?: boolean;
}

// The server allows 90 segments per second per room. Flushing every 33 ms with
// at most 2 segments per flush is about 60 segments per second, even for
// high-rate pointers.
export const STROKE_FLUSH_INTERVAL_MS = 33;
export const MAX_SEGMENTS_PER_FLUSH = 2;

const sameStyle = (a: StrokeSegment, b: StrokeSegment) =>
  a.color === b.color && a.size === b.size && Boolean(a.erase) === Boolean(b.erase);

function mergeRun(run: StrokeSegment[]): StrokeSegment {
  return { ...run[0], from: run[0].from, to: run[run.length - 1].to };
}

// Joins neighbouring segments of one style so the path stays continuous while
// the number of segments sent is bounded.
export function compactSegments(segments: StrokeSegment[], maxSegments: number): StrokeSegment[] {
  if (segments.length <= maxSegments) return segments;

  const runs: StrokeSegment[][] = [];
  for (const segment of segments) {
    const current = runs[runs.length - 1];
    if (current && sameStyle(current[0], segment)) current.push(segment);
    else runs.push([segment]);
  }

  const compacted: StrokeSegment[] = [];
  for (const run of runs) {
    const groups = Math.max(1, Math.min(run.length, Math.round((maxSegments * run.length) / segments.length)));
    const size = Math.ceil(run.length / groups);
    for (let start = 0; start < run.length; start += size) {
      compacted.push(mergeRun(run.slice(start, start + size)));
    }
  }
  return compacted;
}

interface StrokeBufferOptions {
  send: (segments: StrokeSegment[]) => void;
  intervalMs?: number;
  maxSegments?: number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export function createStrokeBuffer(options: StrokeBufferOptions) {
  const intervalMs = options.intervalMs ?? STROKE_FLUSH_INTERVAL_MS;
  const maxSegments = options.maxSegments ?? MAX_SEGMENTS_PER_FLUSH;
  const setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let pending: StrokeSegment[] = [];
  let timer: unknown = null;

  const flush = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    if (pending.length === 0) return;
    const batch = compactSegments(pending, maxSegments);
    pending = [];
    options.send(batch);
  };

  const add = (segment: StrokeSegment) => {
    pending.push(segment);
    if (timer === null) timer = setTimer(flush, intervalMs);
  };

  return { add, flush };
}
