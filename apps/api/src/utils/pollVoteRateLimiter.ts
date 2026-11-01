import rateLimit from 'express-rate-limit';
import { getAuthUser } from '../middleware/auth.js';

// Must be mounted after authMiddleware: requests are counted per signed-in user.
export function createPollVoteRateLimiter(options: { windowMs: number; max: number }) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: (req) => getAuthUser(req)?.id ?? 'unauthenticated',
    message: { success: false, error: { message: 'Too many vote attempts. Please try again later.' } },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const pollVoteRateLimiter = createPollVoteRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });
