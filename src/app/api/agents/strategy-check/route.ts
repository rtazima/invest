import { NextRequest, NextResponse } from "next/server";
import { runStrategyAlignmentCheck } from "@/lib/alerts/strategy";

export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-agent-secret");
  return secret === process.env["AGENT_SECRET"];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runStrategyAlignmentCheck();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[strategy-check]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
