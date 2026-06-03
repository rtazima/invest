import { createClient } from "@supabase/supabase-js";

export type AuditAction = "login" | "page_view" | "council_query";

export interface AuditEntry {
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action: AuditAction;
  resource?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const client = createClient(url, key, { auth: { persistSession: false } });

  await client.from("audit_logs").insert({
    user_id: entry.user_id ?? null,
    user_email: entry.user_email ?? null,
    user_role: entry.user_role ?? null,
    action: entry.action,
    resource: entry.resource ?? null,
    metadata: entry.metadata ?? {},
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
  });
}
