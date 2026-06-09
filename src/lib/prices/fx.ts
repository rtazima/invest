// Usado pelo updater.ts para atualizar o DB (Open Exchange Rates, atualiza ~1x/hora)
export async function fetchUsdBrl(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
      headers: { "User-Agent": "invest-app/1.0" },
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const rate = data.rates?.["BRL"];
      if (rate && rate > 0) return rate;
    }
  } catch {
    // tenta fallback
  }

  const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=BRL", {
    cache: "no-store",
    headers: { "User-Agent": "invest-app/1.0" },
  });
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: { BRL?: number } };
  const rate = data.rates?.BRL;
  if (!rate || rate <= 0) throw new Error("FX rate inválido");
  return rate;
}

// Usado pelo /api/prices/fx (display ao vivo) — Yahoo Finance USDBRL=X, intraday
// Fallback para Open Exchange Rates se Yahoo falhar
export async function fetchUsdBrlLive(): Promise<number> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDBRL%3DX&fields=regularMarketPrice",
      {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      },
    );
    if (res.ok) {
      const data = (await res.json()) as {
        quoteResponse?: { result?: Array<{ regularMarketPrice: number }> };
      };
      const price = data.quoteResponse?.result?.[0]?.regularMarketPrice;
      if (price && price > 0) return price;
    }
  } catch {
    // tenta fallback
  }

  // Fallback: Open Exchange Rates
  return fetchUsdBrl();
}
