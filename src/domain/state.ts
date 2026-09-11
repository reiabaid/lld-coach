import type { AttemptStatus, EvaluationStatus } from "./types";

const ALLOWED_EVALUATION_TRANSITIONS: Record<EvaluationStatus, EvaluationStatus[]> = {
  submitted: ["evaluating"],
  evaluating: ["completed", "failed"],
  completed: [], // terminal
  failed: ["evaluating"], // retry reuses the same row
};

export class InvalidTransitionError extends Error {
  constructor(from: EvaluationStatus, to: EvaluationStatus) {
    super(`Invalid evaluation transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransitionEvaluation(from: EvaluationStatus, to: EvaluationStatus): boolean {
  return ALLOWED_EVALUATION_TRANSITIONS[from].includes(to);
}

/** Throws InvalidTransitionError if the transition isn't in the allow-list. */
export function assertCanTransitionEvaluation(from: EvaluationStatus, to: EvaluationStatus): void {
  if (!canTransitionEvaluation(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/** Attempt.status mirrors its latest Evaluation.status. */
export function deriveAttemptStatus(evaluationStatus: EvaluationStatus): AttemptStatus {
  return evaluationStatus;
}
