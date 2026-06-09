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

// Usado pelo /api/prices/fx (display ao vivo)
// Primário: BCB PTAX (oficial, grátis, sem bloqueio de IP, atualiza 5-6x/dia no pregão)
// Fallback: Open Exchange Rates
export async function fetchUsdBrlLive(): Promise<number> {
  try {
    const today = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Sao_Paulo",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }); // formato MM/DD/YYYY → MM-DD-YYYY
    const dateParam = today.replace(/\//g, "-");
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@d)?$format=json&$select=cotacaoVenda,dataHoraCotacao&@d='${dateParam}'`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "invest-app/1.0" } });
    if (res.ok) {
      const text = await res.text();
      // BCB envolve a resposta em /*...*/ às vezes — remove comentário se existir
      const clean = text.replace(/^\/\*/, "").replace(/\*\/$/, "").trim();
      const data = JSON.parse(clean) as { value?: Array<{ cotacaoVenda: number }> };
      const values = data.value ?? [];
      const last = values[values.length - 1];
      if (last && last.cotacaoVenda > 0) return last.cotacaoVenda;
    }
  } catch {
    // tenta fallback
  }

  // Fallback: Open Exchange Rates
  return fetchUsdBrl();
}
