import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Middleware.
 * Lê/escreve cookies via next/headers para manter sessão.
 *
 * Uso: const supabase = await createServerClient()
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — cookies serão setados pelo middleware
          }
        },
      },
    },
  );
}
