import { NextResponse } from "next/server";
import { listProblems } from "@/lib/repo";

export async function GET() {
  const problems = await listProblems();
  return NextResponse.json({ problems });
}
