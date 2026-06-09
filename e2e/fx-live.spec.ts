import { test, expect } from "@playwright/test";

test("PriceRefresher exibe cotação ao vivo USD/BRL", async ({ page }) => {
  let fxRate: number | null = null;

  // Registra listener antes do navigate para não perder o primeiro fetch
  const fxPromise = page.waitForResponse(
    (r) => r.url().includes("/api/prices/fx") && r.status() === 200,
    { timeout: 15000 }
  );

  await page.goto("/dashboard");

  const fxResponse = await fxPromise;
  const body = await fxResponse.json().catch(() => null) as { rate?: number } | null;
  if (body?.rate) fxRate = body.rate;

  // Cotação deve ser um valor razoável para USD/BRL
  expect(fxRate).not.toBeNull();
  expect(fxRate!).toBeGreaterThan(4);
  expect(fxRate!).toBeLessThan(10);

  // PriceRefresher deve exibir o rate ao vivo, não o valor antigo do banco (5.04)
  await page.waitForSelector("text=USD/BRL", { timeout: 5000 });
  const refresherText = await page.locator("text=USD/BRL").first().textContent();
  console.log("PriceRefresher text:", refresherText);
  expect(refresherText).not.toContain("5.04");
});
