import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { DBAlert, Enums } from "@/types/database";
import { getActiveMutes, isAlertMuted } from "./alert-mutes";

type AnySupabaseClient = ReturnType<typeof createServiceClient>;

export async function getAlerts(options?: {
  holderId?: string;
  severity?: Enums<"alert_severity">;
  status?: Enums<"alert_status">;
  limit?: number;
}): Promise<DBAlert[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("alerts")
    .select("*")
    .order("generated_at", { ascending: false });

  if (options?.holderId) query = query.eq("holder_id", options.holderId);
  if (options?.severity) query = query.eq("severity", options.severity);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.limit) query = query.limit(options.limit);

  const [{ data, error }, mutes] = await Promise.all([query, getActiveMutes()]);
  if (error) throw new Error(`getAlerts: ${error.message}`);

  return (data ?? []).filter((a) => !isAlertMuted(a, mutes));
}

// Cria um alerta apenas se não existir outro idêntico nas últimas `windowHours` horas
export async function createAlertDeduped(
  alert: {
    holder_id?: string;
    ticker?: string;
    severity: Enums<"alert_severity">;
    title: string;
    description: string;
    recommendation?: string;
    sources?: string[];
    generated_by: string;
  },
  windowHours = 24,
  client?: AnySupabaseClient,
): Promise<boolean> {
  const supabase = client ?? (await createServerClient());
  const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

  let dupQuery = supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("generated_by", alert.generated_by)
    .eq("title", alert.title)
    .gte("generated_at", since)
    .neq("status", "dismissed");

  if (alert.holder_id) dupQuery = dupQuery.eq("holder_id", alert.holder_id);
  if (alert.ticker) dupQuery = dupQuery.eq("ticker", alert.ticker);

  const { count } = await dupQuery;
  if ((count ?? 0) > 0) return false;

  const { error } = await supabase.from("alerts").insert({
    ...alert,
    status: "unread",
  });
  if (error) throw new Error(`createAlert: ${error.message}`);
  return true;
}

export async function countUnreadAlerts(): Promise<number> {
  const alerts = await getAlerts({ status: "unread" });
  return alerts.length;
}

export async function markAlertRead(id: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("alerts")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`markAlertRead: ${error.message}`);
}

export async function dismissAlert(id: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("alerts")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`dismissAlert: ${error.message}`);
}
