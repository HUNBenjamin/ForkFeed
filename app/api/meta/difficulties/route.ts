import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export async function GET() {
  return NextResponse.json({ difficulties: DIFFICULTIES }, { status: 200 });
}
