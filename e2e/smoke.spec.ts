import { test, expect } from "@playwright/test";

// Teste sem sessão — precisa de contexto limpo
test("homepage redireciona para /login quando não autenticado", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await ctx.close();
});

test("página de login renderiza sem erros", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await expect(page).toHaveTitle(/Entrar/);
  await ctx.close();
});
