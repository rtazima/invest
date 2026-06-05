import { test, expect } from "@playwright/test";

test("página /transfers carrega sem erros", async ({ page }) => {
  await page.goto("/transfers");
  await expect(page).toHaveURL(/\/transfers/);
  await expect(page).toHaveTitle(/Transferências/);
  // Título da página visível
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Transferências");
});

test("dashboard — tabela com posições exibe checkboxes (ou estado vazio se sem dados)", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const table = page.locator("table").first();
  const hasTable = await table.isVisible().catch(() => false);

  if (hasTable) {
    // Checkbox de select-all no thead
    await expect(table.locator("thead input[type=checkbox]")).toBeVisible();
  } else {
    // Estado vazio esperado para usuário de teste sem dados
    await expect(page.locator("text=Nenhum dado importado")).toBeVisible();
  }
});

test("sidebar — link Transferências presente", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("nav a[href='/transfers']")).toBeVisible();
});
