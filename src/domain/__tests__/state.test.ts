import { describe, expect, it } from "vitest";
import { InvalidTransitionError, assertCanTransitionEvaluation, canTransitionEvaluation } from "@/domain/state";

describe("evaluation state machine", () => {
  it("allows SUBMITTED -> EVALUATING", () => {
    expect(canTransitionEvaluation("submitted", "evaluating")).toBe(true);
  });

  it("allows EVALUATING -> COMPLETED and EVALUATING -> FAILED", () => {
    expect(canTransitionEvaluation("evaluating", "completed")).toBe(true);
    expect(canTransitionEvaluation("evaluating", "failed")).toBe(true);
  });

  it("allows FAILED -> EVALUATING (retry)", () => {
    expect(canTransitionEvaluation("failed", "evaluating")).toBe(true);
  });

  it("rejects SUBMITTED -> COMPLETED directly", () => {
    expect(canTransitionEvaluation("submitted", "completed")).toBe(false);
    expect(() => assertCanTransitionEvaluation("submitted", "completed")).toThrow(
      InvalidTransitionError
    );
  });

  it("rejects COMPLETED -> EVALUATING — COMPLETED is terminal", () => {
    expect(canTransitionEvaluation("completed", "evaluating")).toBe(false);
    expect(() => assertCanTransitionEvaluation("completed", "evaluating")).toThrow(
      InvalidTransitionError
    );
  });
});
