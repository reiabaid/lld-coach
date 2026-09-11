import * as repo from "@/lib/repo";
import { DEFAULT_RUBRIC } from "./rubric";
import { assertCanTransitionEvaluation, deriveAttemptStatus } from "./state";
import { computeOverallScore, deriveRollup } from "./score";
import { EvaluatorOutputError, parseEvaluatorOutput } from "./evaluator";
import type { Evaluator } from "./evaluator";
import type { Attempt, CriterionEvaluation, Evaluation, Problem, Rubric, Submission, SubmissionContent } from "./types";

// Orchestrates: validate -> version submission -> run evaluator -> validate
// output -> COMPLETED/FAILED. Runs synchronously, no queue.

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

const MAX_SUBMISSION_LENGTH = 20_000; // bounds LLM cost/latency, checked before the evaluator runs

export interface SubmitAttemptResult {
  attempt: Attempt;
  submission: Submission;
  evaluation: Evaluation;
}

export async function submitAttempt(
  attemptId: string,
  content: SubmissionContent,
  evaluator: Evaluator
): Promise<SubmitAttemptResult> {
  if (!content.content || content.content.trim().length === 0) {
    throw new ValidationError("Submission content cannot be empty");
  }
  if (content.content.length > MAX_SUBMISSION_LENGTH) {
    throw new ValidationError(
      `Submission content cannot exceed ${MAX_SUBMISSION_LENGTH} characters (got ${content.content.length})`
    );
  }

  const attempt = await repo.getAttempt(attemptId);
  if (!attempt) throw new NotFoundError(`Attempt ${attemptId} not found`);

  const problem = await repo.getProblem(attempt.problemId);
  if (!problem) {
    // "Ownership" in this single-user prototype is just this association
    // resolving — there's no userId to check.
    throw new NotFoundError(`Attempt ${attemptId} references unknown problem ${attempt.problemId}`);
  }

  const rubric = DEFAULT_RUBRIC;

  const submission = await repo.createSubmission(attemptId, content);
  await repo.createEvaluationForSubmission(submission.id, rubric.id);
  await repo.setAttemptStatus(attemptId, deriveAttemptStatus("submitted"));

  const evaluation = await runEvaluation(submission, problem, rubric, evaluator);
  await repo.setAttemptStatus(attemptId, deriveAttemptStatus(evaluation.status));
  const finalAttempt = await repo.getAttempt(attemptId);

  return { attempt: finalAttempt!, submission, evaluation };
}

export async function retryFailedEvaluation(
  attemptId: string,
  evaluator: Evaluator
): Promise<SubmitAttemptResult> {
  const attempt = await repo.getAttempt(attemptId);
  if (!attempt) throw new NotFoundError(`Attempt ${attemptId} not found`);

  const submissions = await repo.listSubmissionsForAttempt(attemptId);
  const latest = submissions[submissions.length - 1];
  if (!latest) throw new NotFoundError(`Attempt ${attemptId} has no submissions to retry`);

  const problem = await repo.getProblem(attempt.problemId);
  if (!problem) throw new NotFoundError(`Attempt ${attemptId} references unknown problem`);

  const existingEvaluation = await repo.getEvaluationBySubmissionId(latest.id);
  if (!existingEvaluation || existingEvaluation.status !== "failed") {
    throw new ValidationError("Only a FAILED evaluation can be retried");
  }

  const rubric = DEFAULT_RUBRIC;
  const evaluation = await runEvaluation(latest, problem, rubric, evaluator);
  await repo.setAttemptStatus(attemptId, deriveAttemptStatus(evaluation.status));
  const finalAttempt = await repo.getAttempt(attemptId);

  return { attempt: finalAttempt!, submission: latest, evaluation };
}

/**
 * Drives one submission's Evaluation through SUBMITTED/FAILED -> EVALUATING
 * -> COMPLETED/FAILED. Reused by both a fresh submission and a retry — the
 * only difference is which status the evaluation started in, which is why
 * the `attempts` counter increments here rather than at the call sites.
 */
async function runEvaluation(
  submission: Submission,
  problem: Problem,
  rubric: Rubric,
  evaluator: Evaluator
): Promise<Evaluation> {
  const existing = await repo.getEvaluationBySubmissionId(submission.id);
  if (!existing) throw new NotFoundError(`No evaluation found for submission ${submission.id}`);

  // Atomic claim, not a separate read-then-write: prevents two concurrent
  // calls (e.g. a double-clicked retry) from both passing the transition
  // check before either has written "evaluating".
  const current = await repo.claimEvaluationForRun(existing.id);
  if (!current) {
    throw new ValidationError("This submission is already being evaluated or has no pending evaluation to run");
  }

  try {
    const raw = await evaluator.evaluate({ submission, problem, rubric });
    const parsed = parseEvaluatorOutput(rubric, raw); // throws EvaluatorOutputError on anything malformed

    const criteria: CriterionEvaluation[] = parsed.criteria.map((c) => {
      const def = rubric.criteria.find((rc) => rc.id === c.criterionId);
      if (!def) throw new EvaluatorOutputError(`Unknown criterion id in evaluator output: ${c.criterionId}`);
      return {
        criterionId: c.criterionId,
        criterionName: def.name,
        score: c.score,
        evidence: c.evidence,
        feedback: c.feedback,
        suggestion: c.suggestion,
        confidence: c.confidence,
      };
    });

    const overallScore = computeOverallScore(criteria, rubric);
    const { strengths, weaknesses, suggestions } = deriveRollup(criteria);

    assertCanTransitionEvaluation("evaluating", "completed");
    return await repo.updateEvaluation(current.id, {
      status: "completed",
      overallScore,
      criteria,
      strengths,
      weaknesses,
      suggestions,
      failureReason: null,
    });
  } catch (err) {
    assertCanTransitionEvaluation("evaluating", "failed");
    const reason = err instanceof Error ? err.message : "Unknown evaluator failure";
    return await repo.updateEvaluation(current.id, {
      status: "failed",
      failureReason: reason,
    });
  }
}
