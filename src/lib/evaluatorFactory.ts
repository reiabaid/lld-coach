import { FakeEvaluator } from "@/domain/evaluators/fakeEvaluator";
import { LLMEvaluator } from "@/domain/evaluators/llmEvaluator";
import type { Evaluator } from "@/domain/evaluator";

// Falls back to FakeEvaluator with no API key set. Groq checked before
// OpenAI (free tier) — both are just LLMEvaluator with a different endpoint.
export function getEvaluator(): Evaluator {
  if (process.env.USE_FAKE_EVALUATOR === "true") {
    return new FakeEvaluator();
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return new LLMEvaluator(
      groqKey,
      process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      "https://api.groq.com/openai/v1"
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new LLMEvaluator(openaiKey, process.env.OPENAI_MODEL ?? "gpt-4o-mini");
  }

  return new FakeEvaluator();
}
