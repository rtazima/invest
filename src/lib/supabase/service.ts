import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente com service role — bypassa RLS. Usar apenas em agentes server-side.
export function createServiceClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
