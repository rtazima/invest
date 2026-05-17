import { createServerClient } from "@/lib/supabase/server";
import { toDecimal } from "@/lib/decimal";
import { isStaleQuota } from "@/lib/dates";
import type { DBPosition, DBImportBatch, Enums } from "@/types/database";
import type { EnrichedPosition } from "@/types/domain";

export async function getLatestPositions(holderId?: string): Promise<EnrichedPosition[]> {
  const supabase = await createServerClient();

  // Busca o batch mais recente por (holder_id, institution) com status completed
  let query = supabase
    .from("positions")
    .select(`
      *,
      batch:import_batches!inner(id, status, completed_at)
    `)
    .order("created_at", { ascending: false });

  if (holderId) {
    query = query.eq("holder_id", holderId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getLatestPositions: ${error.message}`);

  // Agrupa por (holder_id, institution) e mantém apenas o batch mais recente
  const latestByKey = new Map<string, EnrichedPosition>();

  for (const row of data ?? []) {
    const batch = row.batch as DBImportBatch & { status: string };
    if (batch.status !== "completed") continue;

    const key = `${row.holder_id}:${row.institution}:${row.id}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, enrichPosition(row as DBPosition));
    }
  }

  return Array.from(latestByKey.values());
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
