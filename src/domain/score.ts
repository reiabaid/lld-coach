import type { CriterionEvaluation, Rubric } from "./types";

// Weighted sum against the rubric — computed here, not returned by the LLM.
export function computeOverallScore(criteria: CriterionEvaluation[], rubric: Rubric): number {
  const weightById = new Map(rubric.criteria.map((c) => [c.id, c.weight]));
  let total = 0;
  for (const c of criteria) {
    const weight = weightById.get(c.criterionId);
    if (weight === undefined) {
      throw new Error(`Evaluation references unknown criterion id: ${c.criterionId}`);
    }
    total += c.score * weight;
  }
  // Round to one decimal — matches how scores are displayed everywhere else.
  return Math.round(total * 10) / 10;
}

const STRONG_THRESHOLD = 8;
const WEAK_THRESHOLD = 5;

/** Strengths, weaknesses, and suggestions are derived from the criteria — not separately emitted. */
export function deriveRollup(criteria: CriterionEvaluation[]): {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
} {
  const strengths = criteria
    .filter((c) => c.score >= STRONG_THRESHOLD)
    .map((c) => `${c.criterionName}: ${c.feedback}`);

  const weakCriteria = criteria.filter((c) => c.score <= WEAK_THRESHOLD);
  const weaknesses = weakCriteria.map((c) => `${c.criterionName}: ${c.feedback}`);
  const suggestions = weakCriteria.map((c) => c.suggestion);

  return { strengths, weaknesses, suggestions };
}
