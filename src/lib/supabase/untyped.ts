import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente sem tipagem de Database — usado para tabelas novas que ainda não
// foram adicionadas ao database.ts gerado pelo Supabase CLI.
export function createUntypedServiceClient(): SupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  return createClient(url, key, { auth: { persistSession: false } });
}
