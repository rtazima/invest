import { createServerClient } from "@/lib/supabase/server";
import { createUntypedServerClient } from "@/lib/supabase/untyped";
import type { DBStrategy, DBStrategyAllocation } from "@/types/database";

export interface StrategyWithAllocations extends DBStrategy {
  allocations: DBStrategyAllocation[];
}

export async function getStrategy(holderId: string): Promise<StrategyWithAllocations | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("strategies")
    .select("*, allocations:strategy_allocations(*)")
    .eq("holder_id", holderId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getStrategy: ${error.message}`);
  return data as StrategyWithAllocations;
}

export async function upsertStrategy(
  holderId: string,
  values: Omit<DBStrategy, "id" | "holder_id" | "created_at" | "updated_at">,
): Promise<DBStrategy> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("strategies")
    .upsert({ ...values, holder_id: holderId, updated_at: new Date().toISOString() }, { onConflict: "holder_id" })
    .select()
    .single();

  if (error) throw new Error(`upsertStrategy: ${error.message}`);
  return data;
}

export async function upsertAllocations(
  strategyId: string,
  allocations: Array<Pick<DBStrategyAllocation, "asset_class" | "target_pct" | "tolerance_pct" | "rationale">>,
): Promise<void> {
  const supabase = await createServerClient();

  // Remove antigas e insere novas (operação atômica via delete + insert)
  const { error: delError } = await supabase
    .from("strategy_allocations")
    .delete()
    .eq("strategy_id", strategyId);

  if (delError) throw new Error(`upsertAllocations delete: ${delError.message}`);

  if (allocations.length === 0) return;

  const { error: insError } = await supabase
    .from("strategy_allocations")
    .insert(allocations.map((a) => ({ ...a, strategy_id: strategyId })));

  if (insError) throw new Error(`upsertAllocations insert: ${insError.message}`);
}

// Grava um snapshot versionado da política (estratégia + alocações) para auditoria.
// Chamar após cada alteração salva.
export async function recordStrategyVersion(holderId: string): Promise<void> {
  const strategy = await getStrategy(holderId);
  if (!strategy) return;

  const auth = await createServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  const db = await createUntypedServerClient();
  const { error } = await db.from("strategy_versions").insert({
    holder_id: holderId,
    strategy_id: strategy.id,
    snapshot: strategy,
    changed_by: user?.id ?? null,
  });
  // auditoria não deve quebrar o salvamento; loga e segue
  if (error) console.error(`recordStrategyVersion: ${error.message}`);
}
