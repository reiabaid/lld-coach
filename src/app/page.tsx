import Link from "next/link";
import { listProblems } from "@/lib/repo";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-good/10 text-good",
  medium: "bg-warn/10 text-warn",
  hard: "bg-bad/10 text-bad",
};

export default async function ProblemListPage() {
  const problems = await listProblems();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-text mb-3">
        Choose a problem, then see whether your design actually improves.
      </h1>
      <p className="text-muted max-w-2xl mb-10 leading-relaxed">
        Every submission is evaluated against a fixed rubric — not compared to one &quot;correct&quot;
        solution — and every criterion score comes with evidence pointing at your own submission.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {problems.map((problem) => (
          <Link
            key={problem.id}
            href={`/problems/${problem.id}`}
            className="group rounded-md border border-border bg-surface p-5 hover:border-border-strong transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_STYLES[problem.difficulty]}`}
              >
                {problem.difficulty}
              </span>
              {problem.isHero && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  seeded demo
                </span>
              )}
            </div>
            <h2 className="font-semibold text-text group-hover:text-accent transition">
              {problem.title}
            </h2>
            <p className="mt-2 text-sm text-muted line-clamp-3 leading-relaxed">
              {problem.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
