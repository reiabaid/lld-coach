import * as repo from "@/lib/repo";
import { compareEvaluations, type EvolutionComparison } from "./designEvolution";
import type { Attempt, Evaluation, Problem, Submission } from "./types";

export interface AttemptDetail {
  attempt: Attempt;
  problem: Problem | undefined;
  history: Array<{ submission: Submission; evaluation: Evaluation | undefined }>;
  evolution: Array<{ fromVersion: number; toVersion: number; comparison: EvolutionComparison }>;
}

/** Shared by the GET /api/attempts/[id] route and the workspace page's initial server render. */
export async function getAttemptDetail(attemptId: string): Promise<AttemptDetail | null> {
  const attempt = await repo.getAttempt(attemptId);
  if (!attempt) return null;

  const problem = await repo.getProblem(attempt.problemId);
  const history = await repo.getEvaluationsForAttempt(attemptId);

  const evolution: AttemptDetail["evolution"] = [];
  for (let i = 1; i < history.length; i++) {
    const from = history[i - 1].evaluation;
    const to = history[i].evaluation;
    if (from && to) {
      evolution.push({
        fromVersion: history[i - 1].submission.version,
        toVersion: history[i].submission.version,
        comparison: compareEvaluations(from, to),
      });
    }
  }

  return { attempt, problem, history, evolution };
}
