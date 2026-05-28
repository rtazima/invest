import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SESSION_PATH = "playwright/.auth/session.json";

setup("authenticate test user", async ({ page }) => {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const email = process.env["E2E_TEST_EMAIL"];
  const password = process.env["E2E_TEST_PASSWORD"];

  if (!supabaseUrl || !anonKey || !email || !password) {
    throw new Error(
      "Faltam variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_TEST_EMAIL, E2E_TEST_PASSWORD",
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(
      `Login falhou: ${error?.message ?? "sem sessão"}. Crie um usuário de teste com email+senha no Supabase e habilite Email Provider em Authentication → Providers.`,
    );
  }

  // Injeta a sessão no localStorage da aplicação
  await page.goto("/");
  await page.evaluate(
    ({ session, projectRef }) => {
      localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session));
    },
    { session: data.session, projectRef: new URL(supabaseUrl).hostname.split(".")[0] },
  );

  await page.reload();
  // Aguarda redirecionamento pós-login (dashboard ou holders)
  await expect(page).toHaveURL(/\/(dashboard|holders|onboarding)/, { timeout: 15_000 });

  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
  await page.context().storageState({ path: SESSION_PATH });
});
