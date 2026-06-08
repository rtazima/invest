export interface BrapiQuote {
  ticker: string;
  price: number | null;
  pe: number | null;
  pb: number | null;
  dy: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  sector: string | null;
}

interface BrapiResult {
  regularMarketPrice?: number;
  priceEarnings?: number;
  priceToBook?: number;
  dividendsYield?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  sector?: string;
}

interface BrapiResponse {
  results?: BrapiResult[];
}

export async function fetchBrapi(ticker: string): Promise<BrapiQuote | null> {
  try {
    const url = `https://brapi.dev/api/quote/${ticker.toUpperCase()}?fundamental=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const data = (await res.json()) as BrapiResponse;
    const result = data.results?.[0];
    if (!result) return null;

    return {
      ticker: ticker.toUpperCase(),
      price: result.regularMarketPrice ?? null,
      pe: result.priceEarnings ?? null,
      pb: result.priceToBook ?? null,
      dy: result.dividendsYield ?? null,
      avgVolume: result.averageDailyVolume3Month ?? null,
      marketCap: result.marketCap ?? null,
      sector: result.sector ?? null,
    };
  } catch {
    return null;
  }
}
