import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { refreshPositionPrices } from "@/lib/prices/updater";

export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  return req.headers.get("x-agent-secret") === process.env["AGENT_SECRET"];
}

type SupabaseClient = ReturnType<typeof createServiceClient>;

// Replica a lógica de dedup de getLatestPositions usando o service client
async function getActiveBatchIds(supabase: SupabaseClient): Promise<string[]> {
  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, holder_id, institution, filename, source, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (!batches || batches.length === 0) return [];

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

  return [...selected.values()];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Atualiza preços antes de calcular o snapshot
    const priceResult = await refreshPositionPrices();

    // 2. Lê posições ativas (pós-atualização) por holder
    const supabase = createServiceClient();
    const batchIds = await getActiveBatchIds(supabase);

    if (batchIds.length === 0) {
      return NextResponse.json({ error: "Nenhum batch ativo encontrado" }, { status: 400 });
    }

    const { data: positions, error: posErr } = await supabase
      .from("positions")
      .select("holder_id, institution, asset_class, currency, market_value_brl")
      .in("batch_id", batchIds);

    if (posErr) throw new Error(`positions: ${posErr.message}`);

    const { data: holders } = await supabase
      .from("holders")
      .select("id");

    const today = new Date().toISOString().split("T")[0]!;

    // Agrupa por titular
    const byHolder = new Map<string, { total: number; byClass: Record<string, number>; byInstitution: Record<string, number> }>();

    for (const h of holders ?? []) {
      byHolder.set(h.id, { total: 0, byClass: {}, byInstitution: {} });
    }

    for (const pos of positions ?? []) {
      const entry = byHolder.get(pos.holder_id);
      if (!entry) continue;
      const val = Number(pos.market_value_brl ?? 0);
      entry.total += val;
      entry.byClass[pos.asset_class] = (entry.byClass[pos.asset_class] ?? 0) + val;
      entry.byInstitution[pos.institution] = (entry.byInstitution[pos.institution] ?? 0) + val;
    }

    const snapshots = [...byHolder.entries()]
      .filter(([, v]) => v.total > 0)
      .map(([holderId, v]) => ({
        holder_id: holderId,
        date: today,
        total_value_brl: v.total,
        fx_rate: priceResult.fxRate || null,
        breakdown: JSON.parse(JSON.stringify({ byClass: v.byClass, byInstitution: v.byInstitution })) as import("@/types/database").Json,
      }));

    if (snapshots.length === 0) {
      return NextResponse.json({ message: "Nenhum snapshot gerado (sem posições)" });
    }

    const { error: upsertErr } = await supabase
      .from("portfolio_snapshots")
      .upsert(snapshots, { onConflict: "holder_id,date" });

    if (upsertErr) throw new Error(`upsert snapshots: ${upsertErr.message}`);

    return NextResponse.json({
      date: today,
      snapshots: snapshots.length,
      pricesUpdated: priceResult.updated,
      fxRate: priceResult.fxRate,
      errors: priceResult.errors,
    });
  } catch (err) {
    console.error("[portfolio-snapshot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 },
    );
  }
}
