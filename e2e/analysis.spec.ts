import { test, expect } from "@playwright/test";

test("sidebar tem item Análise com sub-items", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Análise" })).toBeVisible();
});

test("/analise redireciona para /analise/acoes", async ({ page }) => {
  await page.goto("/analise");
  await expect(page).toHaveURL(/\/analise\/acoes/);
});

test("página /analise/acoes carrega sem erro", async ({ page }) => {
  await page.goto("/analise/acoes");
  await expect(page).toHaveURL(/\/analise\/acoes/);
  // Título ou estado vazio — qualquer um indica que a página renderizou
  const hasTitle = await page.getByText("Análise de Ações").isVisible();
  const hasEmpty = await page.getByText("Nenhuma ação no portfólio").isVisible();
  expect(hasTitle || hasEmpty).toBe(true);
});

test("sub-items de Análise expandem na sidebar ao navegar", async ({ page }) => {
  await page.goto("/analise/acoes");
  await expect(page.getByRole("link", { name: "Ações" })).toBeVisible();
  await expect(page.getByRole("link", { name: /FIIs/ })).toBeVisible();
});

test("página /analise/fiis carrega como placeholder", async ({ page }) => {
  await page.goto("/analise/fiis");
  await expect(page.getByText("Análise de FIIs")).toBeVisible();
});

test("botão Rodar análise existe na página de ações", async ({ page }) => {
  await page.goto("/analise/acoes");
  await expect(page.getByRole("button", { name: /Rodar análise/ })).toBeVisible();
});
