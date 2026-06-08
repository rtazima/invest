import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente sem tipagem de Database — para tabelas não geradas no database.ts
// Usa auth de usuário via cookies (SSR), sem service role.
export async function createUntypedServerClient(): Promise<SupabaseClient> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausente");

  const cookieStore = await cookies();
  return createSSRServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component — cookies set via middleware
        }
      },
    },
  }) as unknown as SupabaseClient;
}

// Variante com service role — requer SUPABASE_SERVICE_ROLE_KEY
export function createUntypedServiceClient(): SupabaseClient {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  return createClient(url, key, { auth: { persistSession: false } });
}
