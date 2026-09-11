import type { Evaluator, EvaluatorInput, EvaluatorRawResult } from "../evaluator";

// Deterministic, network-free stand-in: length/keyword heuristic, no
// claim to judge design quality. Used by tests and as the no-API-key fallback.
export class FakeEvaluator implements Evaluator {
  async evaluate({ submission, rubric }: EvaluatorInput): Promise<EvaluatorRawResult> {
    const text = submission.content.content;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return {
      criteria: rubric.criteria.map((criterion) => {
        const score = scoreFor(criterion.id, text, wordCount);
        return {
          criterionId: criterion.id,
          score,
          evidence:
            wordCount > 0
              ? `Submission is ${wordCount} words; heuristic keyword match used for "${criterion.name}".`
              : "Submission was empty.",
          feedback: score >= 7 ? `${criterion.name} looks reasonable given the submission length and structure.` : `${criterion.name} could use more depth.`,
          suggestion: `Consider expanding on ${criterion.name.toLowerCase()} with a concrete example.`,
          confidence: Math.max(0.3, Math.min(0.9, wordCount / 150)), // more text, more to judge from
        };
      }),
    };
  }
}

function scoreFor(criterionId: string, text: string, wordCount: number): number {
  const lower = text.toLowerCase();
  let base = Math.min(7, 3 + Math.floor(wordCount / 40));

  const keywordBoosts: Record<string, string[]> = {
    extensibility: ["interface", "strategy", "extend", "plug"],
    solid: ["responsibility", "solid", "interface", "abstract"],
    "domain-modeling": ["class", "entity", "relationship"],
    encapsulation: ["private", "encapsulat", "getter", "setter"],
    "requirement-coverage": ["requirement", "edge case", "capacity"],
    tradeoffs: ["trade-off", "tradeoff", "because", "instead of"],
  };

  for (const kw of keywordBoosts[criterionId] ?? []) {
    if (lower.includes(kw)) base += 1;
  }

  return Math.max(0, Math.min(10, base));
}
