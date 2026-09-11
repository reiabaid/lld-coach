"use client";

import { useState } from "react";
import type { AttemptDetail } from "@/domain/attemptDetail";
import type { Evaluation, Problem, SubmissionContent } from "@/domain/types";

const STATUS_STYLES: Record<string, string> = {
  created: "bg-surface-2 text-muted",
  submitted: "bg-surface-2 text-muted",
  evaluating: "bg-warn/10 text-warn",
  completed: "bg-good/10 text-good",
  failed: "bg-bad/10 text-bad",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-good/10 text-good",
  medium: "bg-warn/10 text-warn",
  hard: "bg-bad/10 text-bad",
};

function scoreTextColor(score: number) {
  return score >= 8 ? "text-good" : score >= 5 ? "text-warn" : "text-bad";
}

function scoreBarColor(score: number) {
  return score >= 8 ? "bg-good" : score >= 5 ? "bg-warn" : "bg-bad";
}

function scoreLabel(score: number) {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Fair";
  return "Needs work";
}

function deltaColor(delta: number) {
  return delta > 0 ? "text-good" : delta < 0 ? "text-bad" : "text-faint";
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-background">
      <div className={`h-1.5 rounded-full ${scoreBarColor(score)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ProblemPanel({ problem }: { problem: Problem }) {
  return (
    <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto rounded-md border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-text">{problem.title}</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[problem.difficulty] ?? ""}`}
        >
          {problem.difficulty}
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed">{problem.description}</p>
      <h2 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        Requirements
      </h2>
      <ul className="space-y-1.5">
        {problem.requirements.map((r) => (
          <li key={r} className="flex gap-2 text-sm text-text">
            <span className="text-accent">·</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2 text-sm font-medium transition ${
        active ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function FeedbackTab({
  evaluation,
  onRetry,
  busy,
}: {
  evaluation: Evaluation | undefined;
  onRetry: () => void;
  busy: boolean;
}) {
  if (!evaluation) {
    return <p className="text-sm text-muted">Submit a solution to see feedback here.</p>;
  }

  if (evaluation.status === "failed") {
    return (
      <div className="rounded-md border border-bad/30 bg-bad/5 p-4">
        <p className="text-sm text-bad">
          Evaluation failed{evaluation.attempts > 0 ? ` (retried ${evaluation.attempts}×)` : ""}
          {evaluation.failureReason ? `: ${evaluation.failureReason}` : "."}
        </p>
        <button
          onClick={onRetry}
          disabled={busy}
          className="mt-3 rounded-md border border-bad/30 px-4 py-2 text-sm font-medium text-bad transition hover:bg-bad/5 disabled:opacity-50"
        >
          Retry evaluation
        </button>
      </div>
    );
  }

  if (evaluation.status !== "completed") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        Evaluating
        <span className="inline-block h-3.5 w-2 animate-pulse bg-accent" />
      </div>
    );
  }

  const score = evaluation.overallScore ?? 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 rounded-md border border-border bg-surface-2 p-4">
        <span className={`font-mono text-4xl font-semibold leading-none ${scoreTextColor(score)}`}>
          {score}
        </span>
        <div>
          <p className={`text-sm font-semibold ${scoreTextColor(score)}`}>{scoreLabel(score)}</p>
          <p className="text-xs text-faint">out of 10, rubric-weighted</p>
        </div>
      </div>

      {(evaluation.strengths.length > 0 || evaluation.weaknesses.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {/* chip = criterion name only, full sentence is a tooltip + in the accordion below */}
          {evaluation.strengths.map((s) => (
            <span
              key={s}
              title={s}
              className="rounded-full bg-good/10 px-2 py-0.5 text-xs text-good"
            >
              + {s.split(": ")[0]}
            </span>
          ))}
          {evaluation.weaknesses.map((w) => (
            <span
              key={w}
              title={w}
              className="rounded-full bg-bad/10 px-2 py-0.5 text-xs text-bad"
            >
              − {w.split(": ")[0]}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {evaluation.criteria.map((c) => (
          <details key={c.criterionId} className="group rounded-md border border-border bg-surface-2">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text">{c.criterionName}</span>
                  <span className={`shrink-0 font-mono text-sm ${scoreTextColor(c.score)}`}>
                    {c.score}/10
                  </span>
                </div>
                <ScoreBar score={c.score} />
              </div>
              <span className="shrink-0 text-xs text-faint transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="space-y-1.5 border-t border-border px-3 pb-3 pt-2">
              <p className="border-l-2 border-border-strong pl-2 text-xs italic text-muted leading-relaxed">
                {c.evidence}
              </p>
              <p className="text-xs text-muted leading-relaxed">{c.feedback}</p>
              {c.score <= 5 && c.suggestion && (
                <p className="text-xs font-medium text-accent">→ {c.suggestion}</p>
              )}
              {c.confidence != null && (
                <p className="text-xs text-faint">Confidence: {Math.round(c.confidence * 100)}%</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function SubmissionsTab({ history }: { history: AttemptDetail["history"] }) {
  return (
    <ul className="space-y-1.5">
      {history.map((h) => (
        <li
          key={h.submission.id}
          className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <span className="font-medium text-text">v{h.submission.version}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[h.evaluation?.status ?? "submitted"]}`}
          >
            {h.evaluation?.status ?? "submitted"}
          </span>
          {h.evaluation?.overallScore != null && (
            <span className="text-muted">{h.evaluation.overallScore}/10</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function EvolutionTab({ evolution }: { evolution: AttemptDetail["evolution"] }) {
  return (
    <div className="space-y-3">
      {evolution.map((e) => (
        <div
          key={`${e.fromVersion}-${e.toVersion}`}
          className={`rounded-md border border-border bg-surface-2 p-3 ${
            e.comparison.comparable
              ? `border-l-2 ${(e.comparison.overallDelta ?? 0) >= 0 ? "border-l-good" : "border-l-bad"}`
              : ""
          }`}
        >
          <p className="mb-1 text-xs font-medium text-faint">
            v{e.fromVersion} → v{e.toVersion}
          </p>
          {e.comparison.comparable ? (
            <>
              <p className="mb-2 text-sm font-medium text-text">
                {e.comparison.overallFrom} → {e.comparison.overallTo}{" "}
                <span className={deltaColor(e.comparison.overallDelta ?? 0)}>
                  ({(e.comparison.overallDelta ?? 0) >= 0 ? "+" : ""}
                  {e.comparison.overallDelta})
                </span>
              </p>
              <ul className="space-y-0.5 text-xs">
                {e.comparison.criteria
                  ?.filter((c) => c.delta !== 0)
                  .map((c) => (
                    <li key={c.criterionId} className={deltaColor(c.delta)}>
                      {c.delta > 0 ? "+" : "−"} {c.criterionName}: {c.from} → {c.to}
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-faint">{e.comparison.reason}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function Workspace({
  attemptId,
  initialDetail,
}: {
  attemptId: string;
  initialDetail: AttemptDetail;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const latest = detail.history[detail.history.length - 1];
  const [content, setContent] = useState(latest?.submission.content.content ?? "");
  const [contentType, setContentType] = useState<SubmissionContent["type"]>(
    latest?.submission.content.type ?? "code"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"feedback" | "submissions" | "evolution">("feedback");

  async function refresh() {
    const res = await fetch(`/api/attempts/${attemptId}`);
    if (res.ok) setDetail(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, content }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Submission failed");
      await refresh();
      setTab("feedback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/retry`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Retry failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const problem = detail.problem!;

  return (
    <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ProblemPanel problem={problem} />

      <div>
        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-md border border-border bg-surface-2">
            <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-bad/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-good/60" />
                </span>
                <span className="font-mono text-xs text-muted">
                  {contentType === "code" ? "solution.ts" : "notes.md"}
                </span>
              </div>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as SubmissionContent["type"])}
                className="rounded border border-border bg-background px-2 py-1 font-mono text-xs text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="code">code</option>
                <option value="text">text</option>
              </select>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Sketch your classes, interfaces, and how they relate. Explain your key trade-offs — that's graded too."
              className="min-h-[60vh] w-full resize-y bg-transparent p-3 font-mono text-sm text-text placeholder:text-faint focus:outline-none"
            />
          </div>
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-3 rounded-md bg-btn-primary-bg px-5 py-2.5 text-sm font-medium text-white transition hover:bg-btn-primary-hover disabled:opacity-50"
          >
            {busy ? "Evaluating…" : `Submit v${(latest?.submission.version ?? 0) + 1}`}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex gap-5 border-b border-border">
            <TabButton active={tab === "feedback"} onClick={() => setTab("feedback")}>
              Feedback
            </TabButton>
            <TabButton active={tab === "submissions"} onClick={() => setTab("submissions")}>
              Submissions ({detail.history.length})
            </TabButton>
            {detail.history.length > 1 && (
              <TabButton active={tab === "evolution"} onClick={() => setTab("evolution")}>
                Evolution
              </TabButton>
            )}
          </div>
          <div className="pt-4">
            {tab === "feedback" && (
              <FeedbackTab evaluation={latest?.evaluation} onRetry={handleRetry} busy={busy} />
            )}
            {tab === "submissions" && <SubmissionsTab history={detail.history} />}
            {tab === "evolution" && <EvolutionTab evolution={detail.evolution} />}
          </div>
        </div>
      </div>
    </div>
  );
}
