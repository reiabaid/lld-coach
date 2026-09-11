import { NextRequest, NextResponse } from "next/server";
import { submitAttempt } from "@/domain/submissionService";
import { getEvaluator } from "@/lib/evaluatorFactory";
import { toErrorResponse } from "@/lib/apiError";
import type { SubmissionContent } from "@/domain/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const type = body?.type;
  const content = body?.content;
  if ((type !== "text" && type !== "code") || typeof content !== "string") {
    return NextResponse.json(
      { error: 'Body must be { type: "text" | "code", content: string }' },
      { status: 400 }
    );
  }

  const submissionContent: SubmissionContent = { type, content };

  try {
    const result = await submitAttempt(id, submissionContent, getEvaluator());
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
