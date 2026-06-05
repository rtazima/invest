import { test, expect } from "@playwright/test";

// Roda com sessão autenticada (storageState do auth.setup.ts)

test("import page mostra seção Pluggy Sync com BTG conectado", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/import");
  await expect(page).toHaveURL(/\/import/);

  // Seção Pluggy Sync visível
  await expect(page.getByText("Sincronizar via Pluggy")).toBeVisible();
  await expect(page.getByText("BTG Pactual Investimentos")).toBeVisible();

  // BTG conectado — botão de sync ativo
  const syncBtn = page.getByRole("button", { name: "Sincronizar agora" });
  await expect(syncBtn).toBeVisible();
  await expect(syncBtn).toBeEnabled();

  // XP sem item ID — aparece como "Em breve"
  await expect(page.getByText("XP Investimentos")).toBeVisible();
  await expect(page.getByText("Em breve")).toBeVisible();

  // Importação manual ainda existe
  await expect(page.getByText("Importação manual")).toBeVisible();

  expect(errors).toHaveLength(0);
});

test("sync BTG via Pluggy insere posições e mostra confirmação", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/import");

  // Clica em Sincronizar agora
  const syncBtn = page.getByRole("button", { name: "Sincronizar agora" });
  await syncBtn.click();

  // Aguarda resultado — fetch Tesouro + Pluggy pode levar ~20s
  await expect(page.locator("text=/posições sincronizadas|Erro/")).toBeVisible({ timeout: 45000 });

  // Deve ser sucesso
  await expect(page.locator("text=/posições sincronizadas/")).toBeVisible();

  expect(errors).toHaveLength(0);
});
