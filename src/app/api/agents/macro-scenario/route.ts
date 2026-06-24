import { NextRequest, NextResponse } from "next/server";
import { runMacroScenario } from "@/lib/scenario/macro";

export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  return req.headers.get("x-agent-secret") === process.env["AGENT_SECRET"];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMacroScenario();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[macro-scenario]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
