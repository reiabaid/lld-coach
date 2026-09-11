import { notFound } from "next/navigation";
import Link from "next/link";
import { getAttemptDetail } from "@/domain/attemptDetail";
import { Workspace } from "@/components/Workspace";

export default async function AttemptWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAttemptDetail(id);
  if (!detail || !detail.problem) notFound();

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Link href={`/problems/${detail.problem.id}`} className="text-sm text-accent hover:underline">
        ← All problems
      </Link>
      <Workspace attemptId={id} initialDetail={detail} />
    </div>
  );
}
