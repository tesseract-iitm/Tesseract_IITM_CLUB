import { Prisma } from '@prisma/client';

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// Runs the operation again when a concurrent writer wins a unique constraint,
// so the caller can derive a fresh value (for example a slug) on each attempt.
export async function retryOnUniqueViolation<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= maxAttempts) throw error;
    }
  }
}
