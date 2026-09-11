import { NextResponse } from "next/server";
import { getAttemptDetail } from "@/domain/attemptDetail";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAttemptDetail(id);
  if (!detail) {
    return NextResponse.json({ error: `Attempt ${id} not found` }, { status: 404 });
  }
  return NextResponse.json(detail);
}
