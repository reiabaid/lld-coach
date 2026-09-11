import { promises as fs } from "fs";
import path from "path";
import type { Attempt, Evaluation, Problem, Rubric, Submission } from "@/domain/types";

// Single JSON file, writes serialized through withLock() below so two
// near-simultaneous submissions can't corrupt it.

export interface DbShape {
  problems: Problem[];
  rubrics: Rubric[];
  attempts: Attempt[];
  submissions: Submission[];
  evaluations: Evaluation[];
}

// Read lazily so tests can point this at a temp file via process.env.DB_PATH.
function getDbPath(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "db.json");
}

function emptyDb(): DbShape {
  return { problems: [], rubrics: [], attempts: [], submissions: [], evaluations: [] };
}

async function readDbFromDisk(): Promise<DbShape> {
  const dbPath = getDbPath();
  try {
    const raw = await fs.readFile(/* turbopackIgnore: true */ dbPath, "utf-8");
    return JSON.parse(raw) as DbShape;
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return emptyDb();
    throw err;
  }
}

async function writeDbToDisk(db: DbShape): Promise<void> {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmpPath, dbPath); // atomic on the same filesystem
}

let writeQueue: Promise<unknown> = Promise.resolve();

/** Serializes read-modify-write cycles so concurrent requests can't race. */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export async function readDb(): Promise<DbShape> {
  return readDbFromDisk();
}

export async function mutateDb<T>(fn: (db: DbShape) => T): Promise<T> {
  return withLock(async () => {
    const db = await readDbFromDisk();
    const result = fn(db);
    await writeDbToDisk(db);
    return result;
  });
}

export async function replaceDb(db: DbShape): Promise<void> {
  return withLock(() => writeDbToDisk(db));
}
