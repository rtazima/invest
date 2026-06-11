import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { refreshPositionPrices } from "@/lib/prices/updater";

export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  return req.headers.get("x-agent-secret") === process.env["AGENT_SECRET"];
}

type SupabaseClient = ReturnType<typeof createServiceClient>;

type ActiveBatch = { id: string; completed_at: string | null };

async function getActiveBatches(supabase: SupabaseClient): Promise<ActiveBatch[]> {
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

  const selectedIds = new Set(selected.values());
  return batches.filter((b) => selectedIds.has(b.id)).map((b) => ({ id: b.id, completed_at: b.completed_at }));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Atualiza preços antes de calcular o snapshot
    const priceResult = await refreshPositionPrices();

    const supabase = createServiceClient();
    const activeBatches = await getActiveBatches(supabase);
    const batchIds = activeBatches.map((b) => b.id);

    if (batchIds.length === 0) {
      return NextResponse.json({ error: "Nenhum batch ativo encontrado" }, { status: 400 });
    }

    // 2. Lê posições ativas (pós-atualização)
    const { data: rawPositions, error: posErr } = await supabase
      .from("positions")
      .select("id, holder_id, institution, asset_class, currency, current_price, market_value, market_value_brl, batch_id, ticker, name")
      .in("batch_id", batchIds);

    if (posErr) throw new Error(`positions: ${posErr.message}`);

    // Dedup: para o mesmo (holder, institution, ticker/name), mantém só o batch mais recente
    const batchTs = new Map(activeBatches.map((b) => [b.id, new Date(b.completed_at ?? 0).getTime()]));
    const posDedup = new Map<string, NonNullable<typeof rawPositions>[0]>();
    for (const p of rawPositions ?? []) {
      const key = `${p.holder_id}:${p.institution}:${p.ticker ?? p.name}`;
      const prev = posDedup.get(key);
      if (!prev || (batchTs.get(p.batch_id) ?? 0) > (batchTs.get(prev.batch_id) ?? 0)) {
        posDedup.set(key, p);
      }
    }
    const positions = [...posDedup.values()];

    const { data: holders } = await supabase.from("holders").select("id");

    const today = new Date().toISOString().split("T")[0]!;

    // 3. Snapshot por titular (portfolio_snapshots)
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

    const holderSnapshots = [...byHolder.entries()]
      .filter(([, v]) => v.total > 0)
      .map(([holderId, v]) => ({
        holder_id: holderId,
        date: today,
        total_value_brl: v.total,
        fx_rate: priceResult.fxRate || null,
        breakdown: JSON.parse(JSON.stringify({ byClass: v.byClass, byInstitution: v.byInstitution })) as import("@/types/database").Json,
      }));

    // 4. Snapshot por posição individual (position_snapshots)
    const positionSnapshots = (positions ?? []).map((p) => ({
      position_id: p.id,
      snapshot_date: today,
      price: p.current_price !== null ? Number(p.current_price) : null,
      market_value: Number(p.market_value),
      market_value_brl: Number(p.market_value_brl ?? p.market_value),
    }));

    // Upsert ambos em paralelo
    const [holderUpsert, positionUpsert] = await Promise.all([
      holderSnapshots.length > 0
        ? supabase
            .from("portfolio_snapshots")
            .upsert(holderSnapshots, { onConflict: "holder_id,date" })
        : Promise.resolve({ error: null }),
      positionSnapshots.length > 0
        ? supabase
            .from("position_snapshots")
            .upsert(positionSnapshots, { onConflict: "position_id,snapshot_date" })
        : Promise.resolve({ error: null }),
    ]);

    if (holderUpsert.error) throw new Error(`upsert portfolio_snapshots: ${holderUpsert.error.message}`);
    if (positionUpsert.error) throw new Error(`upsert position_snapshots: ${positionUpsert.error.message}`);

    return NextResponse.json({
      date: today,
      holderSnapshots: holderSnapshots.length,
      positionSnapshots: positionSnapshots.length,
      pricesUpdated: priceResult.updated,
      pricesSkipped: priceResult.skipped,
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
