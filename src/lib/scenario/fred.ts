// Cliente do FRED (Federal Reserve Bank of St. Louis) para o bloco macro de EUA.
// Requer FRED_API_KEY (gratuita). Sem chave, o bloco é omitido e o cenário segue
// só com Brasil — o agente registra a ausência.
//
// Séries usadas (PRD v2.3, frente 1):
//   DFF      Fed Funds effective (% a.a.)
//   DGS2     Treasury 2 anos (% a.a.)
//   DGS10    Treasury 10 anos (% a.a.)
//   T10Y2Y   inclinação 2s10s (10a menos 2a, em p.p.)
//   CPIAUCSL CPI cheio, com units=pc1 para variação YoY (%)
//   CPILFESL CPI núcleo, com units=pc1 para variação YoY (%)

const FRED = "https://api.stlouisfed.org/fred/series/observations";

export interface FredPoint {
  value: number | null;
  date: string | null; // data da observação (YYYY-MM-DD)
}

export interface UsMacroSnapshot {
  fed_funds: FredPoint;
  treasury_2y: FredPoint;
  treasury_10y: FredPoint;
  slope_2s10s: FredPoint;
  cpi_yoy: FredPoint;
  cpi_core_yoy: FredPoint;
}

async function getJson(url: string, timeoutMs = 12_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface FredObs {
  date: string;
  value: string; // "." quando ausente
}

async function fetchSeries(seriesId: string, apiKey: string, yoy = false): Promise<FredPoint> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "1",
  });
  if (yoy) params.set("units", "pc1"); // percent change from year ago
  try {
    const json = (await getJson(`${FRED}?${params.toString()}`)) as { observations?: FredObs[] };
    const obs = json.observations?.[0];
    if (!obs || obs.value === "." || obs.value === "") return { value: null, date: obs?.date ?? null };
    const v = Number(obs.value);
    return { value: Number.isFinite(v) ? v : null, date: obs.date };
  } catch {
    return { value: null, date: null };
  }
}

// Retorna null quando não há chave configurada, sinalizando que o bloco de EUA
// não entra neste cenário.
export async function fetchUsMacroSnapshot(): Promise<UsMacroSnapshot | null> {
  const apiKey = process.env["FRED_API_KEY"];
  if (!apiKey) return null;

  const [fedFunds, t2y, t10y, slope, cpi, cpiCore] = await Promise.all([
    fetchSeries("DFF", apiKey),
    fetchSeries("DGS2", apiKey),
    fetchSeries("DGS10", apiKey),
    fetchSeries("T10Y2Y", apiKey),
    fetchSeries("CPIAUCSL", apiKey, true),
    fetchSeries("CPILFESL", apiKey, true),
  ]);

  return {
    fed_funds: fedFunds,
    treasury_2y: t2y,
    treasury_10y: t10y,
    slope_2s10s: slope,
    cpi_yoy: cpi,
    cpi_core_yoy: cpiCore,
  };
}

export function usSnapshotToContext(s: UsMacroSnapshot): string {
  const fmt = (p: FredPoint, suffix = "") => (p.value !== null ? `${p.value}${suffix}` : "N/D");
  return [
    "DADOS CORRENTES (EUA, FRED):",
    `- Fed Funds: ${fmt(s.fed_funds, "%")}`,
    `- Treasury 2a: ${fmt(s.treasury_2y, "%")}`,
    `- Treasury 10a: ${fmt(s.treasury_10y, "%")}`,
    `- Inclinação 2s10s: ${fmt(s.slope_2s10s, " p.p.")}`,
    `- CPI cheio (YoY): ${fmt(s.cpi_yoy, "%")}`,
    `- CPI núcleo (YoY): ${fmt(s.cpi_core_yoy, "%")}`,
  ].join("\n");
}

// menor data entre as séries obrigatórias dos EUA, para o cálculo de frescor
export function usOldestDate(s: UsMacroSnapshot): string | null {
  const dates = [s.fed_funds.date, s.treasury_2y.date, s.treasury_10y.date, s.slope_2s10s.date]
    .filter((d): d is string => d !== null)
    .sort();
  return dates[0] ?? null;
}
