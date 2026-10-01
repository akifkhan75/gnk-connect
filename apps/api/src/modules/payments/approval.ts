/** Large payments need two different approvers; a threshold of 0 turns this off. */
export const needsTwoApprovers = (amount: number, threshold: number) =>
  threshold > 0 && amount >= threshold;
