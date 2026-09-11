// Feedback isn't its own type here — no identity or lifecycle apart from an
// Evaluation, so strengths/weaknesses/suggestions just live on Evaluation.

export type Difficulty = "easy" | "medium" | "hard";

export interface Problem {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: Difficulty;
  isHero: boolean; // Parking Lot only — the problem the seeded demo runs on
}

// Mirrors the latest submission's Evaluation.status — the guarded state
// machine lives on Evaluation, this is just a cheap read for the UI.
export type AttemptStatus =
  | "created" // attempt exists, nothing submitted yet
  | "submitted"
  | "evaluating"
  | "completed"
  | "failed";

export interface Attempt {
  id: string;
  problemId: string;
  status: AttemptStatus;
  createdAt: string; // ISO timestamp
}

// Immutable + versioned: resubmitting creates version N+1, never overwrites N.
export type SubmissionContent =
  | { type: "text"; content: string }
  | { type: "code"; content: string };
// adding `diagram` here is the entire cost of a new submission format

export interface Submission {
  id: string;
  attemptId: string;
  version: number; // 1, 2, 3, ... monotonically increasing per attempt
  content: SubmissionContent;
  submittedAt: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number; // 0-1, all criteria in a rubric must sum to 1
  description: string;
  scoringGuidance: {
    excellent: string; // 9-10
    good: string; // 6-8
    weak: string; // 3-5
    poor: string; // 1-2
  };
}

export interface Rubric {
  id: string;
  version: number;
  criteria: RubricCriterion[];
}

export type EvaluationStatus = "submitted" | "evaluating" | "completed" | "failed";

export interface CriterionEvaluation {
  criterionId: string;
  criterionName: string;
  score: number; // 0-10, set by the evaluator (LLM or fake), validated deterministically
  evidence: string; // quote/paraphrase of what's actually in the submission
  feedback: string;
  suggestion: string;
  confidence?: number; // 0-1, the evaluator's own certainty; optional so hand-authored fixtures don't need one
}

export interface Evaluation {
  id: string;
  submissionId: string;
  rubricId: string; // Design Evolution only compares evaluations that share a rubricId
  attempts: number; // retry counter — incremented on FAILED -> EVALUATING, never reset
  status: EvaluationStatus;
  overallScore: number | null; // computed by the app as a weighted sum — the LLM never returns this directly
  criteria: CriterionEvaluation[];
  strengths: string[]; // derived by the app from criteria scoring >= 8
  weaknesses: string[]; // derived by the app from criteria scoring <= 5
  suggestions: string[]; // pulled from the weak criteria's `suggestion` fields
  createdAt: string;
  updatedAt: string;
  failureReason: string | null;
}
