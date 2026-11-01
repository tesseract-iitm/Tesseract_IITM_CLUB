export type PollLifecycleAction = 'close' | 'reopen';

export type PollLifecycleChange =
  | { ok: true; deadline: Date | null }
  | { ok: false; message: string };

export function isPollClosed(deadline: Date | null | undefined, now: Date = new Date()): boolean {
  return Boolean(deadline && deadline.getTime() < now.getTime());
}

// A poll is closed by moving its deadline to now and reopened by clearing the
// deadline, so no separate state needs to be stored.
export function resolveLifecycleChange(
  deadline: Date | null,
  action: PollLifecycleAction,
  now: Date = new Date(),
): PollLifecycleChange {
  const closed = isPollClosed(deadline, now);

  if (action === 'close') {
    return closed ? { ok: false, message: 'Poll is already closed' } : { ok: true, deadline: now };
  }

  return closed ? { ok: true, deadline: null } : { ok: false, message: 'Poll is already open' };
}
