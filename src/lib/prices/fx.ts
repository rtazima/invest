export async function fetchUsdBrl(): Promise<number> {
  // Primário: Open Exchange Rates (sem chave, funciona em IPs cloud)
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

  // Fallback: Frankfurter (ECB data, atualiza 1x/dia)
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
