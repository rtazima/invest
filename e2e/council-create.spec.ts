import { test, expect } from "@playwright/test";

test("council — cria sessão com sucesso e redireciona", async ({ page }) => {
  await page.goto("/holders");
  const firstHolder = page.locator("a[href*='/holders/']").first();
  await firstHolder.waitFor({ timeout: 10_000 });
  const href = await firstHolder.getAttribute("href");
  const holderId = href?.match(/\/holders\/([^/]+)/)?.[1];
  if (!holderId) throw new Error("Nenhum titular encontrado");

  await page.goto(`/holders/${holderId}/council/new`);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

  await page.fill('input[placeholder*="Conselho"]', "Teste de criação E2E");
  await page.fill("textarea", "Estou avaliando aportar em IVVB11 agora.");
  await page.click('button:has-text("Criar sessão")');

  await expect(page).toHaveURL(/\/holders\/.+\/council\/.+/, { timeout: 20_000 });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
});
