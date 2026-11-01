export const STROKE_BUCKET_MAX = 90; // burst tolerance, in strokes
export const STROKE_REFILL_PER_MS = STROKE_BUCKET_MAX / 1000; // refills fully in one second

export interface StrokeBudget {
  tokens: number;
  updatedAt: number;
}

// Token bucket: refill for the time elapsed since the last update, then debit
// one token per stroke. The refilled balance is kept even when the batch is refused.
export function consumeStrokeBudget(
  budget: StrokeBudget,
  strokeCount: number,
  now: number,
): { allowed: boolean; budget: StrokeBudget } {
  const elapsed = Math.max(0, now - budget.updatedAt);
  const refilled = Math.min(STROKE_BUCKET_MAX, budget.tokens + elapsed * STROKE_REFILL_PER_MS);

  if (refilled < strokeCount) {
    return { allowed: false, budget: { tokens: refilled, updatedAt: now } };
  }
  return { allowed: true, budget: { tokens: refilled - strokeCount, updatedAt: now } };
}
