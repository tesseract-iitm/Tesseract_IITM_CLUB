export const DRAWER_BONUS_POINTS = 50;

// The drawer earns a fixed bonus for every correct guess in their round. The
// bonus is not stored as its own row, so it is derived from the guesses.
export function drawerBonusByUser(
  rounds: { drawerId: string; guesses: { correct: boolean }[] }[],
): Map<string, number> {
  const bonuses = new Map<string, number>();
  for (const round of rounds) {
    const correctGuesses = round.guesses.filter((guess) => guess.correct).length;
    if (correctGuesses === 0) continue;
    bonuses.set(round.drawerId, (bonuses.get(round.drawerId) ?? 0) + correctGuesses * DRAWER_BONUS_POINTS);
  }
  return bonuses;
}
