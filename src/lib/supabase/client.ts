import { createBrowserClient } from "@supabase/ssr";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

/**
 * Cliente Supabase para uso em Client Components.
 * Gerencia sessão automaticamente via cookies do browser.
 */
export function createClient() {
  return createBrowserClient(
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
