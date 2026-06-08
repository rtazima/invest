export interface BrapiQuote {
  ticker: string;
  price: number | null;
  pe: number | null;
  pb: number | null;
  dy: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  sector: string | null;
  roe: number | null;
  roa: number | null;
  margBruta: number | null;
  margEbit: number | null;
  margLiquida: number | null;
  crescRec: number | null;
  ebitda: number | null;
  divLiq: number | null;
  enterpriseValue: number | null;
}

interface BrapiResult {
  regularMarketPrice?: number;
  priceEarnings?: number;
  priceToBook?: number;
  dividendsYield?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  sector?: string;
  financialData?: {
    returnOnEquity?: number;
    returnOnAssets?: number;
    grossMargins?: number;
    operatingMargins?: number;
    profitMargins?: number;
    ebitda?: number;
    totalDebt?: number;
    totalCash?: number;
    revenueGrowth?: number;
  };
  defaultKeyStatistics?: {
    priceToBook?: number;
    dividendYield?: number;
    enterpriseValue?: number;
  };
}

interface BrapiResponse {
  results?: BrapiResult[];
}

function pct(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Math.round(v * 10000) / 100; // decimal → %, 2 casas
}

export async function fetchBrapi(ticker: string): Promise<BrapiQuote | null> {
  try {
    const url = `https://brapi.dev/api/quote/${ticker.toUpperCase()}?modules=financialData,defaultKeyStatistics`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const data = (await res.json()) as BrapiResponse;
    const result = data.results?.[0];
    if (!result) return null;

    const fd = result.financialData ?? {};
    const dk = result.defaultKeyStatistics ?? {};

    const totalDebt = fd.totalDebt ?? null;
    const totalCash = fd.totalCash ?? null;
    const divLiq = totalDebt != null && totalCash != null ? totalDebt - totalCash : null;

    return {
      ticker: ticker.toUpperCase(),
      price: result.regularMarketPrice ?? null,
      pe: result.priceEarnings ?? null,
      pb: dk.priceToBook ?? result.priceToBook ?? null,
      dy: pct(dk.dividendYield ?? result.dividendsYield ?? null),
      avgVolume: result.averageDailyVolume3Month ?? null,
      marketCap: result.marketCap ?? null,
      sector: result.sector ?? null,
      roe: pct(fd.returnOnEquity),
      roa: pct(fd.returnOnAssets),
      margBruta: pct(fd.grossMargins),
      margEbit: pct(fd.operatingMargins),
      margLiquida: pct(fd.profitMargins),
      crescRec: pct(fd.revenueGrowth),
      ebitda: fd.ebitda ?? null,
      divLiq,
      enterpriseValue: dk.enterpriseValue ?? null,
    };
  } catch {
    return null;
  }
}
