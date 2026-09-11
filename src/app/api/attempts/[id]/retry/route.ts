import { NextResponse } from "next/server";
import { retryFailedEvaluation } from "@/domain/submissionService";
import { getEvaluator } from "@/lib/evaluatorFactory";
import { toErrorResponse } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await retryFailedEvaluation(id, getEvaluator());
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
