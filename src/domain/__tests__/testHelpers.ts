import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { replaceDb } from "@/lib/db";
import { DEFAULT_RUBRIC } from "@/domain/rubric";
import type { Problem } from "@/domain/types";

/** Points the db module at a brand-new temp file. Call before each test for full isolation. */
export function useTempDb(): void {
  process.env.DB_PATH = path.join(os.tmpdir(), `lld-coach-test-${randomUUID()}.json`);
}

export const TEST_PROBLEM: Problem = {
  id: "parking-lot",
  title: "Parking Lot",
  description: "Design a system for a parking lot with multiple levels and spot types.",
  requirements: [
    "Park and unpark a vehicle",
    "Support multiple vehicle types with different spot requirements",
    "Calculate a parking fee",
    "Handle a full lot",
  ],
  difficulty: "medium",
  isHero: true,
};

export async function seedTestDb(): Promise<void> {
  await replaceDb({
    problems: [TEST_PROBLEM],
    rubrics: [DEFAULT_RUBRIC],
    attempts: [],
    submissions: [],
    evaluations: [],
  });
}
