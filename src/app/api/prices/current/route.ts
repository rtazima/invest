import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // Aceita sessão de usuário autenticado
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const svc = createServiceClient();

    // Batch ativo por (holder, institution) = o mais recente concluído
    // Simplificação: DISTINCT ON completed_at — preciso do SQL raw para eficiência
    const { data: batches } = await svc
      .from("import_batches")
      .select("id, holder_id, institution, source, filename, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (!batches || batches.length === 0) {
      return NextResponse.json({ byHolder: [], totalBrl: 0, fxRate: null, updatedAt: new Date().toISOString() });
    }

    // Reaplica a lógica de dedup (espelho de getLatestPositions)
    const pluggyLatest = new Map<string, string>();
    const supplementLatest = new Map<string, string>();
    for (const b of batches) {
      const hk = `${b.holder_id}:${b.institution}`;
      if (b.source === "pluggy" && !pluggyLatest.has(hk)) pluggyLatest.set(hk, b.id);
      if (b.source === "csv_supplement" && !supplementLatest.has(hk)) supplementLatest.set(hk, b.id);
    }
    const selected = new Map<string, string>();
    for (const b of batches) {
      const hk = `${b.holder_id}:${b.institution}`;
      const pluggyId = pluggyLatest.get(hk);
      if (b.source === "csv_supplement") {
        if (supplementLatest.get(hk) === b.id) selected.set(`${hk}:supplement`, b.id);
      } else if (pluggyId !== undefined) {
        if (b.id === pluggyId) selected.set(hk, b.id);
      } else {
        const key = `${hk}:${b.filename ?? ""}`;
        if (!selected.has(key)) selected.set(key, b.id);
      }
    }

    const batchIds = [...selected.values()];
    if (batchIds.length === 0) {
      return NextResponse.json({ byHolder: [], totalBrl: 0, fxRate: null, updatedAt: new Date().toISOString() });
    }

    const { data: positions } = await svc
      .from("positions")
      .select("holder_id, market_value_brl, exchange_rate, currency")
      .in("batch_id", batchIds);

    const byHolder = new Map<string, number>();
    let fxRate: number | null = null;

    for (const p of positions ?? []) {
      const val = Number(p.market_value_brl ?? 0);
      byHolder.set(p.holder_id, (byHolder.get(p.holder_id) ?? 0) + val);
      if (p.currency === "USD" && p.exchange_rate) fxRate = Number(p.exchange_rate);
    }

    const byHolderArr = [...byHolder.entries()].map(([id, totalBrl]) => ({ id, totalBrl }));
    const totalBrl = byHolderArr.reduce((s, h) => s + h.totalBrl, 0);

    return NextResponse.json({
      byHolder: byHolderArr,
      totalBrl,
      fxRate,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[prices/current]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}
