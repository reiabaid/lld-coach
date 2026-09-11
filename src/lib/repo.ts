import { randomUUID } from "crypto";
import { mutateDb, readDb } from "./db";
import { canTransitionEvaluation } from "@/domain/state";
import type {
  Attempt,
  AttemptStatus,
  Evaluation,
  EvaluationStatus,
  Problem,
  Rubric,
  Submission,
  SubmissionContent,
} from "@/domain/types";

// Typed read/write operations on top of db.ts — the only place domain code touches persistence.

export async function listProblems(): Promise<Problem[]> {
  const db = await readDb();
  return db.problems;
}

export async function getProblem(id: string): Promise<Problem | undefined> {
  const db = await readDb();
  return db.problems.find((p) => p.id === id);
}

export async function getRubric(id: string): Promise<Rubric | undefined> {
  const db = await readDb();
  return db.rubrics.find((r) => r.id === id);
}

export async function createAttempt(problemId: string): Promise<Attempt> {
  return mutateDb((db) => {
    const attempt: Attempt = {
      id: randomUUID(),
      problemId,
      status: "created",
      createdAt: new Date().toISOString(),
    };
    db.attempts.push(attempt);
    return attempt;
  });
}

export async function listAttemptsForProblem(problemId: string): Promise<Attempt[]> {
  const db = await readDb();
  return db.attempts
    .filter((a) => a.problemId === problemId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // newest first
}

export async function getAttempt(id: string): Promise<Attempt | undefined> {
  const db = await readDb();
  return db.attempts.find((a) => a.id === id);
}

export async function setAttemptStatus(id: string, status: AttemptStatus): Promise<void> {
  await mutateDb((db) => {
    const attempt = db.attempts.find((a) => a.id === id);
    if (attempt) attempt.status = status;
  });
}

export async function listSubmissionsForAttempt(attemptId: string): Promise<Submission[]> {
  const db = await readDb();
  return db.submissions
    .filter((s) => s.attemptId === attemptId)
    .sort((a, b) => a.version - b.version);
}

/** Creates the next immutable version of a submission for this attempt. Never overwrites a prior version. */
export async function createSubmission(
  attemptId: string,
  content: SubmissionContent
): Promise<Submission> {
  return mutateDb((db) => {
    const existing = db.submissions.filter((s) => s.attemptId === attemptId);
    const nextVersion = existing.length === 0 ? 1 : Math.max(...existing.map((s) => s.version)) + 1;
    const submission: Submission = {
      id: randomUUID(),
      attemptId,
      version: nextVersion,
      content,
      submittedAt: new Date().toISOString(),
    };
    db.submissions.push(submission);
    return submission;
  });
}

export async function createEvaluationForSubmission(
  submissionId: string,
  rubricId: string
): Promise<Evaluation> {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const evaluation: Evaluation = {
      id: randomUUID(),
      submissionId,
      rubricId,
      attempts: 0,
      status: "submitted",
      overallScore: null,
      criteria: [],
      strengths: [],
      weaknesses: [],
      suggestions: [],
      createdAt: now,
      updatedAt: now,
      failureReason: null,
    };
    db.evaluations.push(evaluation);
    return evaluation;
  });
}

export async function getEvaluation(id: string): Promise<Evaluation | undefined> {
  const db = await readDb();
  return db.evaluations.find((e) => e.id === id);
}

export async function getEvaluationBySubmissionId(
  submissionId: string
): Promise<Evaluation | undefined> {
  const db = await readDb();
  return db.evaluations.find((e) => e.submissionId === submissionId);
}

/**
 * Atomically moves an evaluation to "evaluating" if (and only if) its current
 * status allows that transition — the check and the write happen inside the
 * same db lock, so two concurrent retries on the same FAILED evaluation
 * can't both pass the check before either writes. Returns null if the
 * evaluation wasn't in a state that could be claimed (someone else got there
 * first, or it's already completed).
 */
export async function claimEvaluationForRun(evaluationId: string): Promise<Evaluation | null> {
  return mutateDb((db) => {
    const evaluation = db.evaluations.find((e) => e.id === evaluationId);
    if (!evaluation) return null;
    if (!canTransitionEvaluation(evaluation.status, "evaluating")) return null;

    const isRetry = evaluation.status === "failed";
    evaluation.status = "evaluating";
    evaluation.attempts = isRetry ? evaluation.attempts + 1 : evaluation.attempts;
    evaluation.updatedAt = new Date().toISOString();
    return { ...evaluation };
  });
}

export async function updateEvaluation(
  id: string,
  patch: Partial<Omit<Evaluation, "id">>
): Promise<Evaluation> {
  return mutateDb((db) => {
    const evaluation = db.evaluations.find((e) => e.id === id);
    if (!evaluation) throw new Error(`Evaluation ${id} not found`);
    Object.assign(evaluation, patch, { updatedAt: new Date().toISOString() });
    return evaluation;
  });
}

/** All evaluations for an attempt, joined through its submissions, ordered by submission version. */
export async function getEvaluationsForAttempt(
  attemptId: string
): Promise<Array<{ submission: Submission; evaluation: Evaluation | undefined }>> {
  const db = await readDb();
  const submissions = db.submissions
    .filter((s) => s.attemptId === attemptId)
    .sort((a, b) => a.version - b.version);
  return submissions.map((submission) => ({
    submission,
    evaluation: db.evaluations.find((e) => e.submissionId === submission.id),
  }));
}
