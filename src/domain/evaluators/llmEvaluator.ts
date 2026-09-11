import OpenAI from "openai";
import type { Evaluator, EvaluatorInput } from "../evaluator";
import { EvaluatorOutputError } from "../evaluator";

// Temperature 0 + a fixed model (picked in evaluatorFactory.ts) for
// repeatable-ish output. Output is Zod-validated by the caller, not here.
export class LLMEvaluator implements Evaluator {
  private client: OpenAI;
  private model: string;

  // baseURL lets this same class hit any OpenAI-compatible provider (Groq, etc.).
  constructor(apiKey: string, model: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async evaluate({ submission, problem, rubric }: EvaluatorInput): Promise<unknown> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(submission, problem, rubric);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = completion.choices[0]?.message?.content ?? "";
      return JSON.parse(text);
    } catch (err) {
      // network failure, timeout, or bad JSON all become a FAILED evaluation upstream
      throw new EvaluatorOutputError("LLM call failed or returned unparseable JSON", err);
    }
  }
}

function buildSystemPrompt(): string {
  return [
    "You are an LLD (Low-Level Design) reviewer. There can be more than one valid design for the same problem.",
    "Do not compare the submission against a single canonical solution — evaluate it against the rubric criteria and the problem's stated requirements.",
    "Every score must be justified with `evidence`: a short quote or precise paraphrase of what is actually present in the submission. Never invent code or claims that are not in the submission.",
    "Distinguish a genuine design flaw from a valid alternative design choice — do not penalize a reasonable choice just because it differs from what you might have written.",
    "For each criterion also return `confidence` (0-1): how certain you are in that score given what the submission actually shows. A short or ambiguous submission should get lower confidence, not just a lower score.",
    "Return ONLY a JSON object matching the requested schema. No prose outside the JSON.",
  ].join(" ");
}

function buildUserPrompt(
  submission: EvaluatorInput["submission"],
  problem: EvaluatorInput["problem"],
  rubric: EvaluatorInput["rubric"]
): string {
  const criteriaBlock = rubric.criteria
    .map(
      (c) =>
        `- id: "${c.id}", name: "${c.name}" (weight ${c.weight})\n` +
        `  description: ${c.description}\n` +
        `  9-10: ${c.scoringGuidance.excellent}\n` +
        `  6-8: ${c.scoringGuidance.good}\n` +
        `  3-5: ${c.scoringGuidance.weak}\n` +
        `  1-2: ${c.scoringGuidance.poor}`
    )
    .join("\n");

  const schemaBlock = `{"criteria": [{"criterionId": string, "score": number (0-10), "evidence": string, "feedback": string, "suggestion": string, "confidence": number (0-1)}, ... one entry per criterion above, in any order]}`;

  return [
    `Problem: ${problem.title}`,
    `Description: ${problem.description}`,
    `Requirements:\n${problem.requirements.map((r) => `- ${r}`).join("\n")}`,
    ``,
    `Rubric criteria:\n${criteriaBlock}`,
    ``,
    `Submission (${submission.content.type}, version ${submission.version}):`,
    submission.content.content,
    ``,
    `Respond with a JSON object of exactly this shape:`,
    schemaBlock,
  ].join("\n");
}
