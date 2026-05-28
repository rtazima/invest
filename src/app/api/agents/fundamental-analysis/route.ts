import { NextRequest, NextResponse } from "next/server";
import { runFundamentalAnalysis } from "@/lib/alerts/fundamental";

function authorized(req: NextRequest): boolean {
  return req.headers.get("x-agent-secret") === process.env["AGENT_SECRET"];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFundamentalAnalysis();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[fundamental-analysis]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
