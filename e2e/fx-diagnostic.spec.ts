import { test, expect } from "@playwright/test";

test("diagnóstico: liveAdjustedTotal muda com liveFxRate", async ({ page }) => {
  const responses: { url: string; rate?: number; totalBrl?: number }[] = [];

  page.on("response", async (r) => {
    if (r.url().includes("/api/prices/fx") && r.status() === 200) {
      const b = await r.json().catch(() => null) as { rate?: number } | null;
      responses.push({ url: "fx", rate: b?.rate });
    }
    if (r.url().includes("/api/prices/current") && r.status() === 200) {
      const b = await r.json().catch(() => null) as { totalBrl?: number } | null;
      responses.push({ url: "current", totalBrl: b?.totalBrl });
    }
  });

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // Lê o total exibido no hero card
  const heroText = await page.locator("[data-testid='portfolio-total']").textContent({ timeout: 5000 }).catch(() => null);

  // Fallback: lê qualquer texto grande com R$ no topo
  const allLargeText = await page.locator("text=/R\\$|\\d{1,3}\\.\\d{3}/").allTextContents();

  console.log("=== DIAGNÓSTICO ===");
  console.log("Hero total (data-testid):", heroText);
  console.log("Textos grandes encontrados:", allLargeText.slice(0, 5));
  console.log("Responses capturadas:", responses.slice(0, 6));

  // Verifica se FX está chegando
  const fxResponse = responses.find(r => r.url === "fx");
  const currentResponse = responses.find(r => r.url === "current");

  console.log("FX rate recebida:", fxResponse?.rate);
  console.log("totalBrl do DB:", currentResponse?.totalBrl);
});
