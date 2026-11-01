export type VoteSelectionResult =
  | { ok: true; optionIds: string[] }
  | { ok: false; status: 'BAD_REQUEST' | 'CONFLICT'; message: string };

export function validateVoteSelection(input: {
  requestedOptionIds: string[];
  pollOptionIds: string[];
  allowMultipleChoices: boolean;
}): VoteSelectionResult {
  if (input.pollOptionIds.length === 0) {
    return {
      ok: false,
      status: 'CONFLICT',
      message: 'This is a question-only poll and does not accept votes',
    };
  }

  const optionIds = Array.from(new Set(input.requestedOptionIds));
  const validOptionIds = new Set(input.pollOptionIds);
  if (!optionIds.every((optionId) => validOptionIds.has(optionId))) {
    return { ok: false, status: 'BAD_REQUEST', message: 'One or more selected options are invalid' };
  }

  if (!input.allowMultipleChoices && optionIds.length !== 1) {
    return { ok: false, status: 'BAD_REQUEST', message: 'This poll only allows one selected option' };
  }

  return { ok: true, optionIds };
}
