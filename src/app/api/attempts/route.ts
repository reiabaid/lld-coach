import { NextRequest, NextResponse } from "next/server";
import { createAttempt, getProblem } from "@/lib/repo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const problemId = body?.problemId;
  if (typeof problemId !== "string" || !problemId) {
    return NextResponse.json({ error: "problemId is required" }, { status: 400 });
  }

  const problem = await getProblem(problemId);
  if (!problem) {
    return NextResponse.json({ error: `Unknown problemId: ${problemId}` }, { status: 404 });
  }

  const attempt = await createAttempt(problemId);
  return NextResponse.json({ attempt }, { status: 201 });
}
