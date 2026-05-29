import { test, expect } from "@playwright/test";

test("toggle de privacidade aplica CSS var --privacy-blur no html", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  const toggleBtn = page.getByTitle("Ocultar valores");
  await expect(toggleBtn).toBeVisible();

  // blur inativo inicialmente
  const blurBefore = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--privacy-blur").trim(),
  );
  expect(blurBefore).toBe("0px");

  // Clica para ocultar
  await toggleBtn.click();
  await expect(page.getByTitle("Mostrar valores")).toBeVisible();

  const blurAfter = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--privacy-blur").trim(),
  );
  expect(blurAfter).toBe("8px");

  // Clica para revelar
  await page.getByTitle("Mostrar valores").click();
  await expect(page.getByTitle("Ocultar valores")).toBeVisible();

  const blurReverted = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--privacy-blur").trim(),
  );
  expect(blurReverted).toBe("0px");
});

test("estado persiste via localStorage ao navegar entre páginas", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  await page.getByTitle("Ocultar valores").click();

  const blur = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--privacy-blur").trim(),
  );
  expect(blur).toBe("8px");

  await page.goto("/alerts");
  await expect(page).toHaveURL(/\/alerts/, { timeout: 5_000 });

  // Ícone reflete estado mantido
  await expect(page.getByTitle("Mostrar valores")).toBeVisible();

  // Desativa
  await page.getByTitle("Mostrar valores").click();
});
