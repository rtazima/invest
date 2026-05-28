import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SESSION_PATH = "playwright/.auth/session.json";
const BASE_URL = process.env["E2E_BASE_URL"] ?? "http://localhost:3000";

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
    throw new Error(`Login falhou: ${error?.message ?? "sem sessão"}`);
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const domain = new URL(BASE_URL).hostname;
  const isSecure = BASE_URL.startsWith("https");

  // @supabase/ssr armazena sessão em cookies chunked (máx 3180 chars por cookie)
  const sessionStr = JSON.stringify(data.session);
  const CHUNK_SIZE = 3180;
  const cookieName = `sb-${projectRef}-auth-token`;

  const cookiesToSet = [];
  if (sessionStr.length <= CHUNK_SIZE) {
    cookiesToSet.push({
      name: cookieName,
      value: sessionStr,
      domain,
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "Lax" as const,
    });
  } else {
    let i = 0;
    for (let offset = 0; offset < sessionStr.length; offset += CHUNK_SIZE) {
      cookiesToSet.push({
        name: `${cookieName}.${i}`,
        value: sessionStr.slice(offset, offset + CHUNK_SIZE),
        domain,
        path: "/",
        httpOnly: true,
        secure: isSecure,
        sameSite: "Lax" as const,
      });
      i++;
    }
  }

  await page.context().addCookies(cookiesToSet);
  await page.goto("/");
  await expect(page).toHaveURL(/\/(dashboard|holders|onboarding)/, { timeout: 15_000 });

  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
  await page.context().storageState({ path: SESSION_PATH });
});
