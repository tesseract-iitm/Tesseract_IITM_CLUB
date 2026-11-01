export interface LoggedStroke {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  size: number;
  erase?: boolean;
}

// About 2.5k segments covers a full round at the client's batching rate and
// keeps a rejoin snapshot well under the socket message size limit.
export const MAX_LOGGED_STROKES = 2500;

// Keeps the newest segments when the cap is exceeded.
export function appendToStrokeLog(log: LoggedStroke[], strokes: LoggedStroke[], max = MAX_LOGGED_STROKES): LoggedStroke[] {
  const combined = log.concat(strokes);
  return combined.length > max ? combined.slice(combined.length - max) : combined;
}
