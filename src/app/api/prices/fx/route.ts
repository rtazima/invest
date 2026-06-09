import { NextResponse } from "next/server";
import { fetchUsdBrl } from "@/lib/prices/fx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rate = await fetchUsdBrl();
    return NextResponse.json({ rate, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[prices/fx]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar câmbio" },
      { status: 502 },
    );
  }
}
