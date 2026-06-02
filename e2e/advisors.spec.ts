import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ─── helpers ────────────────────────────────────────────────────────────────

async function getFirstHolderId(): Promise<{ holderId: string; familyId: string } | null> {
  const supabase = createClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const email = process.env["E2E_TEST_EMAIL"]!;
  const password = process.env["E2E_TEST_PASSWORD"]!;
  await supabase.auth.signInWithPassword({ email, password });
  const { data } = await supabase.from("holders").select("id, family_id").limit(1).single();
  return data ? { holderId: data.id, familyId: data.family_id } : null;
}

// ─── /familia — seção de assessores ─────────────────────────────────────────

test("familia — seção Assessores visível para owner", async ({ page }) => {
  await page.goto("/familia");
  await expect(page.getByText("Assessores")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByPlaceholder("assessor@exemplo.com")).toBeVisible();
  await expect(page.getByText("Convidar")).toBeVisible();
});

test("familia — botão Convidar gera link de convite", async ({ page }) => {
  // Email único por execução para evitar conflito de unique constraint
  const testEmail = `assessor.e2e.${Date.now()}@exemplo.com`;

  await page.goto("/familia");
  await page.fill('[placeholder="assessor@exemplo.com"]', testEmail);
  await page.click('button:has-text("Convidar")');

  // Link gerado deve aparecer
  await expect(page.locator("code")).toBeVisible({ timeout: 8_000 });
  const linkText = await page.locator("code").textContent();
  expect(linkText).toMatch(/\/invite\/accept\?token=/);

  // Botão copiar aparece
  await expect(page.getByText("Copiar").first()).toBeVisible();

  // Cleanup — revoga o convite recém-criado
  const supabase = createClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await supabase.auth.signInWithPassword({
    email: process.env["E2E_TEST_EMAIL"]!,
    password: process.env["E2E_TEST_PASSWORD"]!,
  });
  await supabase.from("family_advisors").update({ status: "revoked" }).eq("invited_email", testEmail);
});

// ─── /invite/accept — estados sem autenticação ───────────────────────────────

test("invite/accept — sem token mostra erro", async ({ browser }) => {
  const ctx = await browser.newContext(); // sem auth cookies
  const page = await ctx.newPage();
  await page.goto("/invite/accept");
  await expect(page.getByText("Link inválido")).toBeVisible({ timeout: 10_000 });
  await ctx.close();
});

test("invite/accept — token inexistente mostra erro", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/invite/accept?token=00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("Convite inválido")).toBeVisible({ timeout: 10_000 });
  await ctx.close();
});

test("invite/accept — token válido sem login pede autenticação", async ({ browser }) => {
  const supabase = createClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: process.env["E2E_TEST_EMAIL"]!,
    password: process.env["E2E_TEST_PASSWORD"]!,
  });

  const ctx2 = await getFirstHolderId();
  if (!user || !ctx2) throw new Error("Setup falhou");

  // Email único por execução
  const testEmail = `sem.login.e2e.${Date.now()}@exemplo.com`;

  // Cria convite para email diferente do owner
  const { data: advisor } = await supabase
    .from("family_advisors")
    .insert({
      family_id: ctx2.familyId,
      invited_email: testEmail,
      role: "advisor_read",
      invited_by: user.id,
    })
    .select("invite_token")
    .single();

  if (!advisor) throw new Error("Falha ao criar convite de teste");

  // Navega sem autenticação: storageState vazio para não herdar sessão do projeto
  const browserCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await browserCtx.newPage();
  await page.goto(`/invite/accept?token=${advisor.invite_token}`);

  await expect(page.getByText("Fazer login")).toBeVisible({ timeout: 10_000 });

  // Cleanup
  await supabase
    .from("family_advisors")
    .update({ status: "revoked" })
    .eq("invite_token", advisor.invite_token);

  await browserCtx.close();
});

// ─── Conselho — toggle autônomo ──────────────────────────────────────────────

test("conselho — nova sessão exibe toggle autônomo", async ({ page }) => {
  await page.goto("/holders");
  const firstHolder = page.locator("a[href*='/holders/']").first();
  await firstHolder.waitFor({ timeout: 10_000 });
  const href = await firstHolder.getAttribute("href");
  const holderId = href?.match(/\/holders\/([^/]+)/)?.[1];
  if (!holderId) throw new Error("Nenhum titular encontrado");

  await page.goto(`/holders/${holderId}/council/new`);
  await expect(page.getByText("Rodar de forma autônoma")).toBeVisible({ timeout: 10_000 });

  // Toggle começa desligado; clicar liga
  const toggle = page.locator("div").filter({ hasText: "Rodar de forma autônoma" }).first();
  await toggle.locator("div").first().click();
  // Só verificamos que a interação não gera erro — o estado é visual (background CSS)
});
