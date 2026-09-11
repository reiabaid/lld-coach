import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAttempt, getProblem, listAttemptsForProblem } from "@/lib/repo";

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = await getProblem(id);
  if (!problem) notFound();

  const existingAttempts = await listAttemptsForProblem(id);

  async function startAttempt() {
    "use server";
    const attempt = await createAttempt(id);
    redirect(`/attempts/${attempt.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← All problems
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text">{problem.title}</h1>
      <p className="mt-3 text-muted leading-relaxed">{problem.description}</p>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-faint">
        Requirements
      </h2>
      <ul className="mt-3 space-y-2">
        {problem.requirements.map((r) => (
          <li key={r} className="flex gap-2 text-text">
            <span className="text-accent">·</span>
            {r}
          </li>
        ))}
      </ul>

      <form action={startAttempt} className="mt-10">
        <button
          type="submit"
          className="rounded-md bg-btn-primary-bg px-5 py-2.5 text-sm font-medium text-white transition hover:bg-btn-primary-hover"
        >
          Start a new attempt
        </button>
      </form>

      {existingAttempts.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
            Previous attempts
          </h2>
          <ul className="space-y-2">
            {existingAttempts.map((a) => (
              <li key={a.id}>
                <Link href={`/attempts/${a.id}`} className="text-sm text-accent hover:underline">
                  Attempt started {new Date(a.createdAt).toLocaleString()} —{" "}
                  <span className="text-muted">{a.status}</span>
                  {problem.isHero ? " (seeded demo)" : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
