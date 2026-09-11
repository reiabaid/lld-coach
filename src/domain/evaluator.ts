import { z } from "zod";
import type { Problem, Rubric, Submission } from "./types";

export interface EvaluatorInput {
  submission: Submission;
  problem: Problem;
  rubric: Rubric;
}

export interface RawCriterionResult {
  criterionId: string;
  score: number;
  evidence: string;
  feedback: string;
  suggestion: string;
  confidence: number; // 0-1, the evaluator's own certainty in this score
}

export interface EvaluatorRawResult {
  criteria: RawCriterionResult[];
}

export interface Evaluator {
  // Returns raw, unvalidated output — parseEvaluatorOutput() below is the
  // only trust boundary, called the same way regardless of implementation.
  evaluate(input: EvaluatorInput): Promise<unknown>;
}

/** Validates evaluator output shape before the app trusts it — not a judgment of design quality. */
export function buildEvaluatorOutputSchema(rubric: Rubric) {
  const validIds = rubric.criteria.map((c) => c.id);

  return z
    .object({
      criteria: z
        .array(
          z.object({
            criterionId: z.enum(validIds as [string, ...string[]]),
            score: z.number().min(0).max(10),
            evidence: z.string().min(1),
            feedback: z.string().min(1),
            suggestion: z.string().min(1),
            confidence: z.number().min(0).max(1),
          })
        )
        .length(rubric.criteria.length),
    })
    .refine(
      (data) => {
        const seen = new Set(data.criteria.map((c) => c.criterionId));
        return seen.size === rubric.criteria.length && validIds.every((id) => seen.has(id));
      },
      { message: "Evaluator output must cover every rubric criterion exactly once" }
    );
}

export class EvaluatorOutputError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "EvaluatorOutputError";
  }
}

/** Parses + validates raw evaluator output. Throws EvaluatorOutputError on anything malformed. */
export function parseEvaluatorOutput(rubric: Rubric, raw: unknown): EvaluatorRawResult {
  const schema = buildEvaluatorOutputSchema(rubric);
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new EvaluatorOutputError(
      `Evaluator output failed schema validation: ${result.error.message}`,
      result.error
    );
  }
  return result.data;
}
