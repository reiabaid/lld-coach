import type { Evaluation } from "./types";

export interface CriterionDelta {
  criterionId: string;
  criterionName: string;
  from: number;
  to: number;
  delta: number;
}

export interface EvolutionComparison {
  comparable: boolean;
  reason?: string;
  overallFrom?: number;
  overallTo?: number;
  overallDelta?: number;
  criteria?: CriterionDelta[];
}

// Only comparable when both evaluations used the same rubricId.
export function compareEvaluations(from: Evaluation, to: Evaluation): EvolutionComparison {
  if (from.status !== "completed" || to.status !== "completed") {
    return { comparable: false, reason: "Both evaluations must be COMPLETED to compare." };
  }
  if (from.rubricId !== to.rubricId) {
    return { comparable: false, reason: "Evaluations were scored against different rubric versions." };
  }

  const criteria: CriterionDelta[] = to.criteria.map((toCriterion) => {
    const fromCriterion = from.criteria.find((c) => c.criterionId === toCriterion.criterionId);
    const fromScore = fromCriterion?.score ?? 0;
    return {
      criterionId: toCriterion.criterionId,
      criterionName: toCriterion.criterionName,
      from: fromScore,
      to: toCriterion.score,
      delta: Math.round((toCriterion.score - fromScore) * 10) / 10,
    };
  });

  return {
    comparable: true,
    overallFrom: from.overallScore ?? 0,
    overallTo: to.overallScore ?? 0,
    overallDelta: Math.round(((to.overallScore ?? 0) - (from.overallScore ?? 0)) * 10) / 10,
    criteria,
  };
}
