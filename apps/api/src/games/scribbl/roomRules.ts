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
  const active = input.members.filter((member) => member.active);
  if (active.length < 2) return true;
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
