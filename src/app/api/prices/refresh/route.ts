import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { refreshPositionPrices } from "@/lib/prices/updater";

export const maxDuration = 60;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = req.headers.get("x-agent-secret");
  if (secret && secret === process.env["AGENT_SECRET"]) return true;

  // Aceita sessão de usuário autenticado (chamada do dashboard)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshPositionPrices();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[prices/refresh]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 },
    );
  }
}
