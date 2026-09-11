import { describe, expect, it } from "vitest";
import { computeOverallScore, deriveRollup } from "@/domain/score";
import { DEFAULT_RUBRIC, assertRubricIsValid } from "@/domain/rubric";
import type { CriterionEvaluation } from "@/domain/types";

describe("rubric", () => {
  it("has weights summing to exactly 1.0", () => {
    expect(() => assertRubricIsValid(DEFAULT_RUBRIC)).not.toThrow();
  });
});

describe("computeOverallScore", () => {
  it("computes a weighted sum, never trusting an LLM-provided overall score", () => {
    const criteria: CriterionEvaluation[] = DEFAULT_RUBRIC.criteria.map((c) => ({
      criterionId: c.id,
      criterionName: c.name,
      score: 8,
      evidence: "e",
      feedback: "f",
      suggestion: "s",
    }));
    // All criteria scored 8, weights sum to 1 -> weighted sum must be exactly 8.
    expect(computeOverallScore(criteria, DEFAULT_RUBRIC)).toBe(8);
  });

  it("weights criteria differently, not just averaging", () => {
    const criteria: CriterionEvaluation[] = DEFAULT_RUBRIC.criteria.map((c) => ({
      criterionId: c.id,
      criterionName: c.name,
      score: c.id === "extensibility" ? 10 : 0, // extensibility has 0.2 weight
      evidence: "e",
      feedback: "f",
      suggestion: "s",
    }));
    expect(computeOverallScore(criteria, DEFAULT_RUBRIC)).toBe(2); // 10 * 0.2
  });

  it("throws if a criterion references an id the rubric doesn't have", () => {
    const criteria: CriterionEvaluation[] = [
      { criterionId: "not-a-real-id", criterionName: "x", score: 5, evidence: "e", feedback: "f", suggestion: "s" },
    ];
    expect(() => computeOverallScore(criteria, DEFAULT_RUBRIC)).toThrow();
  });
});

describe("deriveRollup", () => {
  it("buckets strong criteria as strengths and weak ones as weaknesses/suggestions", () => {
    const criteria: CriterionEvaluation[] = [
      { criterionId: "a", criterionName: "Strong One", score: 9, evidence: "e", feedback: "great", suggestion: "n/a" },
      { criterionId: "b", criterionName: "Weak One", score: 3, evidence: "e", feedback: "needs work", suggestion: "do X" },
      { criterionId: "c", criterionName: "Middling", score: 6.5, evidence: "e", feedback: "ok", suggestion: "n/a" },
    ];
    const { strengths, weaknesses, suggestions } = deriveRollup(criteria);
    expect(strengths).toHaveLength(1);
    expect(strengths[0]).toContain("Strong One");
    expect(weaknesses).toHaveLength(1);
    expect(weaknesses[0]).toContain("Weak One");
    expect(suggestions).toEqual(["do X"]);
  });
});
