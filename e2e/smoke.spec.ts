import { test, expect } from "@playwright/test";

test("homepage redireciona para /login quando não autenticado", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("página de login renderiza sem erros", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/Entrar/);
});
