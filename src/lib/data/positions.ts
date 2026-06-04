import { createServerClient } from "@/lib/supabase/server";
import { toDecimal } from "@/lib/decimal";
import { isStaleQuota } from "@/lib/dates";
import type { DBPosition, DBImportBatch, Enums } from "@/types/database";
import type { EnrichedPosition } from "@/types/domain";

export interface PositionForReview {
  id: string;
  holder_id: string;
  holder_name: string;
  institution: Enums<"institution">;
  ticker: string | null;
  name: string | null;
  asset_class: Enums<"asset_class">;
  market_value_brl: number;
}

export async function getPositionsForReview(): Promise<PositionForReview[]> {
  const supabase = await createServerClient();

  // Pega batches mais recentes (mesmo algoritmo de getLatestPositions)
  const { data: batches, error: batchErr } = await supabase
    .from("import_batches")
    .select("id, holder_id, institution, filename, source, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (batchErr) throw new Error(`getPositionsForReview/batches: ${batchErr.message}`);

  const pluggyLatest = new Map<string, string>();
  for (const b of batches ?? []) {
    if (b.source !== "pluggy") continue;
    const hk = `${b.holder_id}:${b.institution}`;
    if (!pluggyLatest.has(hk)) pluggyLatest.set(hk, b.id);
  }

  const selected = new Map<string, string>();
  for (const b of batches ?? []) {
    const hk = `${b.holder_id}:${b.institution}`;
    const pluggyId = pluggyLatest.get(hk);
    if (pluggyId !== undefined) {
      if (b.id === pluggyId) selected.set(hk, b.id);
    } else {
      const key = `${hk}:${b.filename ?? ""}`;
      if (!selected.has(key)) selected.set(key, b.id);
    }
  }

  const batchIds = Array.from(selected.values());
  if (batchIds.length === 0) return [];

  const { data: positions, error: posErr } = await supabase
    .from("positions")
    .select("id, holder_id, institution, ticker, name, asset_class, market_value_brl")
    .in("batch_id", batchIds)
    .order("market_value_brl", { ascending: false });

  if (posErr) throw new Error(`getPositionsForReview/positions: ${posErr.message}`);

  const { data: holders, error: holderErr } = await supabase
    .from("holders")
    .select("id, name");

  if (holderErr) throw new Error(`getPositionsForReview/holders: ${holderErr.message}`);

  const holderMap = new Map((holders ?? []).map((h) => [h.id, h.name]));

  return (positions ?? []).map((p) => ({
    id: p.id,
    holder_id: p.holder_id,
    holder_name: holderMap.get(p.holder_id) ?? "—",
    institution: p.institution as Enums<"institution">,
    ticker: p.ticker,
    name: p.name,
    asset_class: p.asset_class as Enums<"asset_class">,
    market_value_brl: p.market_value_brl ?? 0,
  }));
}

export async function updatePositionAssetClass(
  positionId: string,
  assetClass: Enums<"asset_class">,
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("positions")
    .update({ asset_class: assetClass })
    .eq("id", positionId);

  if (error) throw new Error(`updatePositionAssetClass: ${error.message}`);
}

export async function getLatestPositions(holderId?: string): Promise<EnrichedPosition[]> {
  const supabase = await createServerClient();

  // Pega batches completed, ordenados do mais recente para o mais antigo
  let batchQuery = supabase
    .from("import_batches")
    .select("id, holder_id, institution, filename, source, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (holderId) batchQuery = batchQuery.eq("holder_id", holderId);

  const { data: batches, error: batchErr } = await batchQuery;
  if (batchErr) throw new Error(`getLatestPositions/batches: ${batchErr.message}`);

  // Regra de deduplicação:
  // - Se existe batch Pluggy para (holder, institution), ele representa o estado atual;
  //   batches CSV/XLSX/PDF da mesma dupla são ignorados no dashboard (mas preservados no banco).
  // - Se não existe batch Pluggy, dedup por (holder, institution, filename): re-importar o
  //   mesmo arquivo substitui; arquivos distintos coexistem (sub-contas separadas).
  const pluggyLatest = new Map<string, string>(); // "holderId:institution" → batchId
  for (const b of batches ?? []) {
    if (b.source !== "pluggy") continue;
    const hk = `${b.holder_id}:${b.institution}`;
    if (!pluggyLatest.has(hk)) pluggyLatest.set(hk, b.id); // já ordenado desc
  }

  const selected = new Map<string, string>(); // chave de dedup → batchId
  for (const b of batches ?? []) {
    const hk = `${b.holder_id}:${b.institution}`;
    const pluggyId = pluggyLatest.get(hk);
    if (pluggyId !== undefined) {
      if (b.id === pluggyId) selected.set(hk, b.id);
    } else {
      const key = `${hk}:${b.filename ?? ""}`;
      if (!selected.has(key)) selected.set(key, b.id);
    }
  }

  const batchIds = Array.from(selected.values());
  if (batchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .in("batch_id", batchIds)
    .order("market_value_brl", { ascending: false });

  if (error) throw new Error(`getLatestPositions/positions: ${error.message}`);
  return (data ?? []).map(enrichPosition);
}

export async function getPositionsByBatch(batchId: string): Promise<EnrichedPosition[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("batch_id", batchId)
    .order("market_value_brl", { ascending: false });

  if (error) throw new Error(`getPositionsByBatch: ${error.message}`);
  return (data ?? []).map(enrichPosition);
}

export async function getImportBatches(holderId?: string): Promise<DBImportBatch[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("import_batches")
    .select("*")
    .order("imported_at", { ascending: false });

  if (holderId) query = query.eq("holder_id", holderId);

  const { data, error } = await query;
  if (error) throw new Error(`getImportBatches: ${error.message}`);
  return data ?? [];
}

export async function getLatestBatchByInstitution(
  holderId: string,
  institution: Enums<"institution">,
): Promise<DBImportBatch | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("holder_id", holderId)
    .eq("institution", institution)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getLatestBatchByInstitution: ${error.message}`);
  return data;
}

function enrichPosition(row: DBPosition): EnrichedPosition {
  const marketValueBrl = toDecimal(row.market_value_brl ?? row.market_value);
  const pnlDecimal = row.pnl !== null ? toDecimal(row.pnl) : null;
  const pnlPctDecimal = row.pnl_pct !== null ? toDecimal(row.pnl_pct) : null;

  const effectiveAssetClass =
    row.liquidity_days !== null && row.liquidity_days <= 7
      ? ("liquidity" as const)
      : row.asset_class;

  return {
    ...row,
    asset_class: effectiveAssetClass,
    marketValueBrl,
    pnlDecimal,
    pnlPctDecimal,
    isStaleQuota: row.asset_class === "funds" ? isStaleQuota(row.quota_date) : false,
    structureRefs: [],
  };
}
