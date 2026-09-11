import type { Rubric } from "./types";

// Weights must sum to 1.0 — enforced by assertRubricIsValid below.
export const DEFAULT_RUBRIC: Rubric = {
  id: "rubric-v1",
  version: 1,
  criteria: [
    {
      id: "requirement-coverage",
      name: "Requirement Coverage",
      weight: 0.2,
      description:
        "Does the design actually address the stated requirements, including the less obvious ones (concurrency of access, capacity limits, pricing variation)?",
      scoringGuidance: {
        excellent:
          "Every stated requirement maps to a clear place in the design, including edge cases like a full lot or an unpaid exit.",
        good: "Core requirements are covered; one or two secondary requirements are thin or implicit.",
        weak: "Only the obvious happy-path requirement (park a car) is addressed.",
        poor: "The design doesn't clearly address the problem's stated requirements at all.",
      },
    },
    {
      id: "domain-modeling",
      name: "Domain Modeling",
      weight: 0.2,
      description:
        "Are the entities, value objects, and relationships the right shape for this problem — not too many, not too few?",
      scoringGuidance: {
        excellent:
          "Entities map cleanly to real concepts in the problem; relationships and cardinality are explicit and correct.",
        good: "Reasonable entities with a couple of debatable choices (e.g. a missing value object, an over-broad class).",
        weak: "Entities exist but blur multiple concepts together, or invent structure the problem doesn't need.",
        poor: "No real modeling — a bag of fields and functions with no entity boundaries.",
      },
    },
    {
      id: "encapsulation",
      name: "Encapsulation & Responsibilities",
      weight: 0.15,
      description:
        "Does each class own a clear, singular responsibility, with internal state protected behind behavior rather than exposed as public fields?",
      scoringGuidance: {
        excellent:
          "Each class has one clear reason to change; internal state is private and mutated only through methods that preserve invariants.",
        good: "Mostly clean, with one class doing slightly more than it should.",
        weak: "Multiple unrelated responsibilities are concentrated in one or two classes.",
        poor: "State is public and mutated from anywhere; no real encapsulation.",
      },
    },
    {
      id: "extensibility",
      name: "Extensibility",
      weight: 0.2,
      description:
        "If a likely requirement changes (new pricing rule, new vehicle type, new payment method), how much existing code has to change?",
      scoringGuidance: {
        excellent:
          "Likely requirement changes need minimal modification to existing classes — new behavior slots in behind an existing seam.",
        good: "Some extension points exist, but certain changes would still touch existing responsibilities.",
        weak: "Significant conditional logic (long if/switch chains) or tight coupling would need untangling.",
        poor: "The design is highly coupled and difficult to extend without a rewrite.",
      },
    },
    {
      id: "solid",
      name: "SOLID / Design Quality",
      weight: 0.15,
      description:
        "Where SOLID principles or a design pattern would genuinely help, are they applied — and not applied where they wouldn't?",
      scoringGuidance: {
        excellent:
          "SOLID principles are visibly respected where it matters; any pattern used earns its place rather than being decorative.",
        good: "Generally sound, with one principle bent for a reason that's at least defensible.",
        weak: "Clear violations (e.g. a class that both decides and executes, or subclassing used for what should be composition).",
        poor: "No apparent awareness of responsibility separation.",
      },
    },
    {
      id: "tradeoffs",
      name: "Trade-offs & Explanation",
      weight: 0.1,
      description:
        "Does the submission explain *why* it made its key decisions, including what it chose not to do and why?",
      scoringGuidance: {
        excellent:
          "Key decisions are explained with real trade-offs named (what was gained, what was given up, what would change under different constraints).",
        good: "Some rationale given, but mostly assertion rather than trade-off reasoning.",
        weak: "Little to no explanation of why the design looks the way it does.",
        poor: "No explanation at all.",
      },
    },
  ],
};

export function assertRubricIsValid(rubric: Rubric): void {
  const total = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(
      `Rubric ${rubric.id} v${rubric.version} has weights summing to ${total}, not 1.0`
    );
  }
}
