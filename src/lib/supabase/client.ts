import { createBrowserClient } from "@supabase/ssr";

// process.env.NEXT_PUBLIC_* must be accessed with static dot notation so Next.js
// replaces them with literal values at build time. Dynamic bracket access (process.env[name])
// resolves to undefined in the browser bundle.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(url, key);
}
