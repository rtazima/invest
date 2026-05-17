import { createServerClient } from "@/lib/supabase/server";
import type { DBAlert, Enums } from "@/types/database";

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

  const { data, error } = await query;
  if (error) throw new Error(`getAlerts: ${error.message}`);
  return data ?? [];
}

export async function countUnreadAlerts(): Promise<number> {
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread");

  if (error) throw new Error(`countUnreadAlerts: ${error.message}`);
  return count ?? 0;
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
