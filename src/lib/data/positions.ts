import { createServerClient } from "@/lib/supabase/server";
import { toDecimal } from "@/lib/decimal";
import { isStaleQuota } from "@/lib/dates";
import type { DBPosition, DBImportBatch, Enums } from "@/types/database";
import type { EnrichedPosition } from "@/types/domain";

export async function getLatestPositions(holderId?: string): Promise<EnrichedPosition[]> {
  const supabase = await createServerClient();

  // Pega o batch mais recente por (holder_id, institution) com status completed
  let batchQuery = supabase
    .from("import_batches")
    .select("id, holder_id, institution, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (holderId) batchQuery = batchQuery.eq("holder_id", holderId);

  const { data: batches, error: batchErr } = await batchQuery;
  if (batchErr) throw new Error(`getLatestPositions/batches: ${batchErr.message}`);

  // Para cada (holder_id, institution), mantém só o batch mais recente
  const latestBatchId = new Map<string, string>();
  for (const b of batches ?? []) {
    const key = `${b.holder_id}:${b.institution}`;
    if (!latestBatchId.has(key)) latestBatchId.set(key, b.id);
  }

  const batchIds = Array.from(latestBatchId.values());
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

  return {
    ...row,
    marketValueBrl,
    pnlDecimal,
    pnlPctDecimal,
    isStaleQuota: row.asset_class === "funds" ? isStaleQuota(row.quota_date) : false,
  };
}
