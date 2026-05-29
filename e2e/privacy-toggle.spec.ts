import { test, expect } from "@playwright/test";

test("toggle de privacidade alterna atributo data-privacy-hidden no wrapper", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  // Olho visível no header, modo iniciando como visível
  const showBtn = page.getByTitle("Ocultar valores");
  await expect(showBtn).toBeVisible();

  // Wrapper não tem o atributo quando visível
  const wrapper = page.locator("[data-privacy-hidden]");
  await expect(wrapper).toHaveCount(0);

  // Clica para ocultar
  await showBtn.click();
  await expect(page.getByTitle("Mostrar valores")).toBeVisible();

  // Wrapper passa a ter o atributo
  await expect(wrapper).toHaveCount(1);

  // Clica para revelar
  await page.getByTitle("Mostrar valores").click();
  await expect(page.getByTitle("Ocultar valores")).toBeVisible();
  await expect(wrapper).toHaveCount(0);
});

test("estado de privacidade persiste ao navegar entre páginas", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  // Ativa modo privacidade
  await page.getByTitle("Ocultar valores").click();
  await expect(page.locator("[data-privacy-hidden]")).toHaveCount(1);

  // Navega para alertas
  await page.goto("/alerts");
  await expect(page).toHaveURL(/\/alerts/, { timeout: 5_000 });

  // Ícone mostra "Mostrar" — estado mantido
  await expect(page.getByTitle("Mostrar valores")).toBeVisible();

  // Desativa para não afetar outros testes
  await page.getByTitle("Mostrar valores").click();
  await expect(page.locator("[data-privacy-hidden]")).toHaveCount(0);
});
