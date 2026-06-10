export interface BrapiQuote {
  ticker: string;
  price: number;
}

export async function fetchBrapiQuotes(tickers: string[]): Promise<Map<string, BrapiQuote>> {
  if (tickers.length === 0) return new Map();

  const symbols = tickers.join(",");
  const token = process.env["BRAPI_TOKEN"];
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbols)}${token ? `?token=${token}` : ""}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "invest-app/1.0" },
  });

  if (!res.ok) throw new Error(`Brapi HTTP ${res.status}`);

  const data = (await res.json()) as {
    results?: Array<{ symbol: string; regularMarketPrice: number | null }>;
  };

  const map = new Map<string, BrapiQuote>();
  for (const q of data.results ?? []) {
    if (q.regularMarketPrice != null && q.regularMarketPrice > 0) {
      map.set(q.symbol, { ticker: q.symbol, price: q.regularMarketPrice });
    }
  }
  return map;
}
