import { NextResponse } from "next/server";
import { NotFoundError, ValidationError } from "@/domain/submissionService";

/** Maps domain errors to the right HTTP status instead of a blanket 500. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
