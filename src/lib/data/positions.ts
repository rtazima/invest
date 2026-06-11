import { createServerClient } from "@/lib/supabase/server";
import { createUntypedServerClient } from "@/lib/supabase/untyped";
import { toDecimal } from "@/lib/decimal";
import { isStaleQuota } from "@/lib/dates";
import { getActiveTransfers } from "@/lib/data/transfers";
import type { DBPosition, DBImportBatch, Enums } from "@/types/database";
import type { EnrichedPosition } from "@/types/domain";

export interface PositionForReview {
  id: string;
  holder_id: string;
  holder_name: string;
  holder_slug: string;
  institution: Enums<"institution">;
  ticker: string | null;
  name: string | null;
  asset_class: Enums<"asset_class">;
  currency: string;
  quantity: number;
  market_value: number;
  market_value_brl: number;
  archetype: string | null;
  subsegment: string | null;
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
  const supplementLatest = new Map<string, string>();
  for (const b of batches ?? []) {
    const hk = `${b.holder_id}:${b.institution}`;
    if (b.source === "pluggy" && !pluggyLatest.has(hk)) pluggyLatest.set(hk, b.id);
    if (b.source === "csv_supplement" && !supplementLatest.has(hk)) supplementLatest.set(hk, b.id);
  }

  const selected = new Map<string, string>();
  for (const b of batches ?? []) {
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

  const batchIds = Array.from(selected.values());
  if (batchIds.length === 0) return [];

  const { data: positions, error: posErr } = await supabase
    .from("positions")
    .select("id, holder_id, institution, ticker, name, asset_class, currency, quantity, market_value, market_value_brl")
    .in("batch_id", batchIds)
    .order("market_value_brl", { ascending: false });

  if (posErr) throw new Error(`getPositionsForReview/positions: ${posErr.message}`);

  const { data: holders, error: holderErr } = await supabase
    .from("holders")
    .select("id, name, slug");

  if (holderErr) throw new Error(`getPositionsForReview/holders: ${holderErr.message}`);

  const holderMap = new Map((holders ?? []).map((h) => [h.id, { name: h.name, slug: h.slug ?? "" }]));

  const CLASSIFIABLE = new Set(["stocks_br", "stocks_intl", "fiis", "etf_br", "etf_intl"]);
  const classifiedTickers = [...new Set(
    (positions ?? [])
      .filter(p => CLASSIFIABLE.has(p.asset_class) && p.ticker)
      .map(p => p.ticker as string)
  )];

  let archetypeMap = new Map<string, { archetype: string; subsegment: string | null }>();
  if (classifiedTickers.length > 0) {
    const db = await createUntypedServerClient();
    const { data: archetypes } = await db.from("asset_archetypes").select("ticker, archetype, subsegment").in("ticker", classifiedTickers);
    archetypeMap = new Map(
      ((archetypes ?? []) as { ticker: string; archetype: string; subsegment: string | null }[]).map(a => [a.ticker, { archetype: a.archetype, subsegment: a.subsegment ?? null }])
    );
  }

  return (positions ?? []).map((p) => ({
    id: p.id,
    holder_id: p.holder_id,
    holder_name: holderMap.get(p.holder_id)?.name ?? "—",
    holder_slug: holderMap.get(p.holder_id)?.slug ?? "",
    institution: p.institution as Enums<"institution">,
    ticker: p.ticker,
    name: p.name,
    asset_class: p.asset_class as Enums<"asset_class">,
    currency: p.currency ?? "BRL",
    quantity: Number(p.quantity ?? 0),
    market_value: Number(p.market_value ?? p.market_value_brl ?? 0),
    market_value_brl: p.market_value_brl ?? 0,
    archetype: p.ticker ? (archetypeMap.get(p.ticker)?.archetype ?? null) : null,
    subsegment: p.ticker ? (archetypeMap.get(p.ticker)?.subsegment ?? null) : null,
  }));
}

export async function saveArchetypeForTicker(
  ticker: string,
  archetype: string,
  subsegment: string | null,
  assetClass: string,
): Promise<void> {
  const db = await createUntypedServerClient();
  await db.from("asset_archetypes").upsert(
    { ticker, archetype, subsegment: subsegment ?? null, asset_class: assetClass, classified_by: 'manual' },
    { onConflict: "ticker" },
  );
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

  // Regras de deduplicação:
  // 1. Se existe batch Pluggy para (holder, institution), é a fonte principal — batches
  //    CSV/XLSX/PDF normais da mesma dupla ficam ocultos no dashboard (mas preservados no banco).
  // 2. Batches com source='csv_supplement' (Tesouro Direto importado manualmente para
  //    complementar o Pluggy) sempre aparecem junto com o Pluggy — nunca são ocultados.
  // 3. Sem Pluggy: dedup por (holder, institution, filename); re-importar o mesmo arquivo
  //    substitui; arquivos distintos coexistem (sub-contas separadas).
  const pluggyLatest = new Map<string, string>(); // "holderId:institution" → batchId
  const supplementLatest = new Map<string, string>(); // "holderId:institution" → batchId

  for (const b of batches ?? []) {
    const hk = `${b.holder_id}:${b.institution}`;
    if (b.source === "pluggy" && !pluggyLatest.has(hk)) pluggyLatest.set(hk, b.id);
    if (b.source === "csv_supplement" && !supplementLatest.has(hk)) supplementLatest.set(hk, b.id);
  }

  const selected = new Map<string, string>(); // chave de dedup → batchId
  for (const b of batches ?? []) {
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

  const batchIds = Array.from(selected.values());
  if (batchIds.length === 0) return [];

  const [{ data, error }, activeTransfers] = await Promise.all([
    supabase
      .from("positions")
      .select("*")
      .in("batch_id", batchIds)
      .order("market_value_brl", { ascending: false }),
    getActiveTransfers(),
  ]);

  if (error) throw new Error(`getLatestPositions/positions: ${error.message}`);

  // Dedup por posição: quando o mesmo (holder, institution, ticker/name) aparece em
  // múltiplos batches ativos (xlsx com filenames distintos), mantém só o mais recente.
  const batchTs = new Map(
    (batches ?? []).map((b) => [b.id, new Date(b.completed_at ?? 0).getTime()])
  );
  const posDedup = new Map<string, (typeof data)[0]>();
  for (const row of data ?? []) {
    const key = `${row.holder_id}:${row.institution}:${row.ticker ?? row.name}`;
    const prev = posDedup.get(key);
    if (!prev || (batchTs.get(row.batch_id) ?? 0) > (batchTs.get(prev.batch_id) ?? 0)) {
      posDedup.set(key, row);
    }
  }
  const deduped = [...posDedup.values()].sort(
    (a, b) => Number(b.market_value_brl ?? 0) - Number(a.market_value_brl ?? 0)
  );

  const rows = applyTransferFilter(deduped, activeTransfers);
  return rows.map(enrichPosition);
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

function applyTransferFilter(
  rows: DBPosition[],
  transfers: Awaited<ReturnType<typeof getActiveTransfers>>,
): DBPosition[] {
  if (transfers.length === 0) return rows;

  // Build a map: "holderId:institution:ticker_or_name" → transferred quantity
  const tMap = new Map<string, number>();
  for (const t of transfers) {
    const key = t.ticker
      ? `${t.holder_id}:${t.from_institution}:t:${t.ticker.toUpperCase()}`
      : `${t.holder_id}:${t.from_institution}:n:${t.asset_name}`;
    tMap.set(key, (tMap.get(key) ?? 0) + t.quantity);
  }

  const result: DBPosition[] = [];
  for (const pos of rows) {
    const tickerKey = pos.ticker
      ? `${pos.holder_id}:${pos.institution}:t:${pos.ticker.toUpperCase()}`
      : null;
    const nameKey = `${pos.holder_id}:${pos.institution}:n:${pos.name}`;

    const transferred = (tickerKey !== null ? (tMap.get(tickerKey) ?? 0) : 0) || (tMap.get(nameKey) ?? 0);
    if (transferred <= 0) {
      result.push(pos);
      continue;
    }

    const posQty = Number(pos.quantity ?? 0);
    if (transferred >= posQty) continue; // full transfer — suppress

    // Partial transfer: scale values proportionally
    const ratio = (posQty - transferred) / posQty;
    result.push({
      ...pos,
      quantity: posQty - transferred,
      market_value: (Number(pos.market_value ?? 0)) * ratio,
      market_value_brl: (Number(pos.market_value_brl ?? pos.market_value ?? 0)) * ratio,
      pnl: pos.pnl !== null ? Number(pos.pnl) * ratio : null,
      cost_basis: pos.cost_basis !== null ? Number(pos.cost_basis) * ratio : null,
    } as unknown as DBPosition);
  }
  return result;
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
