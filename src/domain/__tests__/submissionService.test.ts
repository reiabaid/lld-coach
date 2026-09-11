import { beforeEach, describe, expect, it } from "vitest";
import * as repo from "@/lib/repo";
import { submitAttempt, retryFailedEvaluation, ValidationError } from "@/domain/submissionService";
import { FakeEvaluator } from "@/domain/evaluators/fakeEvaluator";
import type { Evaluator, EvaluatorInput } from "@/domain/evaluator";
import { seedTestDb, useTempDb, TEST_PROBLEM } from "./testHelpers";

/** Always returns well-formed-looking-but-invalid JSON — used to exercise the FAILED path. */
class BrokenEvaluator implements Evaluator {
  async evaluate(_input: EvaluatorInput): Promise<unknown> {
    return { criteria: [{ criterionId: "not-a-real-criterion", score: 999 }] };
  }
}

/** Throws, simulating a dead network / API outage. */
class UnreachableEvaluator implements Evaluator {
  async evaluate(_input: EvaluatorInput): Promise<unknown> {
    throw new Error("ECONNREFUSED");
  }
}

/** Takes a moment to resolve, so concurrent calls actually overlap. */
class SlowEvaluator implements Evaluator {
  async evaluate(input: EvaluatorInput): Promise<unknown> {
    await new Promise((r) => setTimeout(r, 20));
    return new FakeEvaluator().evaluate(input);
  }
}

beforeEach(async () => {
  useTempDb();
  await seedTestDb();
});

describe("attempt + submission lifecycle", () => {
  it("1. an attempt can be created", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    expect(attempt.id).toBeTruthy();
    expect(attempt.status).toBe("created");
    expect(attempt.problemId).toBe(TEST_PROBLEM.id);
  });

  it("2. an empty submission is rejected", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    await expect(
      submitAttempt(attempt.id, { type: "text", content: "   " }, new FakeEvaluator())
    ).rejects.toThrow(ValidationError);
  });

  it("2b. an oversized submission is rejected before reaching the evaluator", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const tooLong = "a".repeat(20_001);
    await expect(
      submitAttempt(attempt.id, { type: "text", content: tooLong }, new FakeEvaluator())
    ).rejects.toThrow(ValidationError);
  });

  it("3. a submitted attempt is immutable — resubmitting creates a new version, not an overwrite", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const evaluator = new FakeEvaluator();

    const first = await submitAttempt(attempt.id, { type: "text", content: "class ParkingLot {}" }, evaluator);
    expect(first.submission.version).toBe(1);

    const second = await submitAttempt(
      attempt.id,
      { type: "text", content: "class ParkingLot { private spots: Spot[]; }" },
      evaluator
    );
    expect(second.submission.version).toBe(2);
    expect(second.submission.id).not.toBe(first.submission.id);

    const history = await repo.listSubmissionsForAttempt(attempt.id);
    expect(history).toHaveLength(2);
    // v1's content is untouched by the v2 submission.
    expect(history[0].content.content).toBe("class ParkingLot {}");
  });

  it("6. a successful evaluation reaches COMPLETED with a computed overall score", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const result = await submitAttempt(
      attempt.id,
      { type: "text", content: "class ParkingLot implements ParkingStrategy { /* ... */ }" },
      new FakeEvaluator()
    );
    expect(result.evaluation.status).toBe("completed");
    expect(result.evaluation.overallScore).not.toBeNull();
    expect(result.evaluation.criteria).toHaveLength(6); // one per rubric criterion
    expect(result.attempt.status).toBe("completed");
  });

  it("7. a malformed evaluator response reaches FAILED, not a crash", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const result = await submitAttempt(
      attempt.id,
      { type: "text", content: "class ParkingLot {}" },
      new BrokenEvaluator()
    );
    expect(result.evaluation.status).toBe("failed");
    expect(result.evaluation.failureReason).toBeTruthy();
    expect(result.attempt.status).toBe("failed");
  });

  it("an unreachable evaluator (network failure) also reaches FAILED, not a crash", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const result = await submitAttempt(
      attempt.id,
      { type: "text", content: "class ParkingLot {}" },
      new UnreachableEvaluator()
    );
    expect(result.evaluation.status).toBe("failed");
  });

  it("a retried evaluation increments the attempts counter on the same evaluation row", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const failed = await submitAttempt(
      attempt.id,
      { type: "text", content: "class ParkingLot {}" },
      new BrokenEvaluator()
    );
    expect(failed.evaluation.attempts).toBe(0);

    const retried = await retryFailedEvaluation(attempt.id, new FakeEvaluator());
    expect(retried.evaluation.id).toBe(failed.evaluation.id); // same row, not a new one
    expect(retried.evaluation.attempts).toBe(1);
    expect(retried.evaluation.status).toBe("completed");
  });

  it("two concurrent retries on the same FAILED evaluation don't both run — one wins, one is rejected", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const failed = await submitAttempt(
      attempt.id,
      { type: "text", content: "class ParkingLot {}" },
      new BrokenEvaluator()
    );

    const results = await Promise.allSettled([
      retryFailedEvaluation(attempt.id, new SlowEvaluator()),
      retryFailedEvaluation(attempt.id, new SlowEvaluator()),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ValidationError);

    const finalEvaluation = await repo.getEvaluationBySubmissionId(failed.submission.id);
    expect(finalEvaluation?.attempts).toBe(1); // incremented once, not twice
    expect(finalEvaluation?.status).toBe("completed");
  });

  it("8. multiple submissions on one attempt preserve full history", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const evaluator = new FakeEvaluator();
    await submitAttempt(attempt.id, { type: "text", content: "v1 content here" }, evaluator);
    await submitAttempt(attempt.id, { type: "text", content: "v2 content, more detail" }, evaluator);
    await submitAttempt(attempt.id, { type: "text", content: "v3 content, even more detail added" }, evaluator);

    const joined = await repo.getEvaluationsForAttempt(attempt.id);
    expect(joined).toHaveLength(3);
    expect(joined.map((j) => j.submission.version)).toEqual([1, 2, 3]);
    expect(joined.every((j) => j.evaluation?.status === "completed")).toBe(true);
  });

  it("9. integration: submit -> evaluate -> feedback -> history round-trips through the real service + repo", async () => {
    const attempt = await repo.createAttempt(TEST_PROBLEM.id);
    const submitResult = await submitAttempt(
      attempt.id,
      { type: "code", content: "class ParkingLot { private spots: Spot[]; park() {} }" },
      new FakeEvaluator()
    );

    // Feedback: fetch the evaluation back by submission id, as the API layer would.
    const fetchedEvaluation = await repo.getEvaluationBySubmissionId(submitResult.submission.id);
    expect(fetchedEvaluation?.status).toBe("completed");
    const totalNotes = (fetchedEvaluation?.strengths.length ?? 0) + (fetchedEvaluation?.weaknesses.length ?? 0);
    expect(totalNotes).toBeGreaterThan(0);

    // History: the attempt now shows one submission with its evaluation attached.
    const history = await repo.getEvaluationsForAttempt(attempt.id);
    expect(history).toHaveLength(1);
    expect(history[0].evaluation?.id).toBe(fetchedEvaluation?.id);
  });
});
