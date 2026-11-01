interface RuleMember {
  userId: string;
  active: boolean;
}

// A round is over once the drawer has left, fewer than two players remain, or
// every connected guesser has solved the word. Disconnected players never block it.
export function shouldEndRound(input: {
  members: RuleMember[];
  drawerId: string | null;
  solvedUserIds: ReadonlySet<string>;
}): boolean {
  if (!hasEnoughPlayers(input.members)) return true;
  const active = input.members.filter((member) => member.active);
  if (!active.some((member) => member.userId === input.drawerId)) return true;
  return active
    .filter((member) => member.userId !== input.drawerId)
    .every((member) => input.solvedUserIds.has(member.userId));
}

// The host stays host while connected; otherwise the first connected player takes over.
export function pickHost(members: RuleMember[], currentHostId: string): string | null {
  const active = members.filter((member) => member.active);
  if (active.some((member) => member.userId === currentHostId)) return currentHostId;
  return active[0]?.userId ?? null;
}

export const MIN_PLAYERS = 2;

export function hasEnoughPlayers(members: RuleMember[]): boolean {
  return members.filter((member) => member.active).length >= MIN_PLAYERS;
}
