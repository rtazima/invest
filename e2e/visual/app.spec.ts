import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "playwright-report/screenshots";

async function shot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function noConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("regressão visual", () => {
  test("dashboard carrega sem erros", async ({ page }) => {
    const errors = await noConsoleErrors(page);
    await page.goto("/dashboard");
    await expect(page.locator("h1, h2, nav, main").first()).toBeVisible({
      timeout: 15_000,
    });
    await shot(page, "dashboard");
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("lista de titulares renderiza", async ({ page }) => {
    const errors = await noConsoleErrors(page);
    await page.goto("/holders");
    // Deve aparecer pelo menos um link de titular
    await expect(page.locator("a[href*='/holders/']").first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "holders");
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("página de estratégia do primeiro titular", async ({ page }) => {
    await page.goto("/holders");
    const firstHolder = page.locator("a[href*='/holders/']").first();
    await firstHolder.waitFor({ timeout: 10_000 });
    const href = await firstHolder.getAttribute("href");

    if (!href) throw new Error("Nenhum titular encontrado");

    const holderId = href.match(/\/holders\/([^/]+)/)?.[1];
    if (!holderId) throw new Error("Não foi possível extrair holderId");

    const errors = await noConsoleErrors(page);
    await page.goto(`/holders/${holderId}/strategy`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "strategy");
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("página de importação renderiza", async ({ page }) => {
    const errors = await noConsoleErrors(page);
    await page.goto("/import");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "import");
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("página de alertas renderiza", async ({ page }) => {
    const errors = await noConsoleErrors(page);
    await page.goto("/alerts");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "alerts");
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });
});
