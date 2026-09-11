import { describe, expect, it } from "vitest";
import { compareEvaluations } from "@/domain/designEvolution";
import type { Evaluation } from "@/domain/types";

function makeEvaluation(overrides: Partial<Evaluation>): Evaluation {
  const now = new Date().toISOString();
  return {
    id: "eval-1",
    submissionId: "sub-1",
    rubricId: "rubric-v1",
    attempts: 0,
    status: "completed",
    overallScore: 5,
    criteria: [
      { criterionId: "extensibility", criterionName: "Extensibility", score: 4, evidence: "e", feedback: "f", suggestion: "s" },
    ],
    strengths: [],
    weaknesses: [],
    suggestions: [],
    createdAt: now,
    updatedAt: now,
    failureReason: null,
    ...overrides,
  };
}

describe("compareEvaluations (Design Evolution)", () => {
  it("computes a delta when both evaluations share a rubric version", () => {
    const from = makeEvaluation({ overallScore: 5.8 });
    const to = makeEvaluation({
      overallScore: 8.1,
      criteria: [
        { criterionId: "extensibility", criterionName: "Extensibility", score: 8, evidence: "e", feedback: "f", suggestion: "s" },
      ],
    });

    const comparison = compareEvaluations(from, to);
    expect(comparison.comparable).toBe(true);
    expect(comparison.overallDelta).toBeCloseTo(2.3);
    expect(comparison.criteria?.[0].delta).toBe(4);
  });

  it("refuses to compare across different rubric versions, rather than showing a misleading diff", () => {
    const from = makeEvaluation({ rubricId: "rubric-v1" });
    const to = makeEvaluation({ rubricId: "rubric-v2" });

    const comparison = compareEvaluations(from, to);
    expect(comparison.comparable).toBe(false);
    expect(comparison.reason).toMatch(/rubric/i);
  });

  it("refuses to compare a non-COMPLETED evaluation", () => {
    const from = makeEvaluation({ status: "failed" });
    const to = makeEvaluation({ status: "completed" });

    expect(compareEvaluations(from, to).comparable).toBe(false);
  });
});
