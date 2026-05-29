import { test, expect } from "@playwright/test";

test("toggle de privacidade aplica blur nos valores .num", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  const toggleBtn = page.getByTitle("Ocultar valores");
  await expect(toggleBtn).toBeVisible();

  // html não tem o atributo quando visível
  await expect(page.locator("html")).not.toHaveAttribute("data-privacy-hidden");

  // Clica para ocultar
  await toggleBtn.click();
  await expect(page.getByTitle("Mostrar valores")).toBeVisible();

  // html passa a ter o atributo — CSS blur fica ativo para todos os .num
  await expect(page.locator("html")).toHaveAttribute("data-privacy-hidden", "");

  // Clica para revelar
  await page.getByTitle("Mostrar valores").click();
  await expect(page.getByTitle("Ocultar valores")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-privacy-hidden");
});

test("estado de privacidade persiste ao navegar entre páginas", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  await page.getByTitle("Ocultar valores").click();
  await expect(page.locator("html")).toHaveAttribute("data-privacy-hidden", "");

  await page.goto("/alerts");
  await expect(page).toHaveURL(/\/alerts/, { timeout: 5_000 });

  await expect(page.getByTitle("Mostrar valores")).toBeVisible();

  // Desativa para não afetar outros testes
  await page.getByTitle("Mostrar valores").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-privacy-hidden");
});
