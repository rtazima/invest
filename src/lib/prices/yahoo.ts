export interface YahooQuote {
  ticker: string;
  price: number;
  changePercent: number | null;
  marketState: string;
}

// v7 bulk API está Unauthorized — usa v8 chart (por ticker, paralelo)
export async function fetchYahooQuotes(tickers: string[]): Promise<Map<string, YahooQuote>> {
  if (tickers.length === 0) return new Map();

  const results = await Promise.allSettled(
    tickers.map(async (symbol) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Yahoo v8 ${symbol}: HTTP ${res.status}`);
      const data = (await res.json()) as {
        chart?: { result?: Array<{ meta: { symbol: string; regularMarketPrice: number; marketState?: string } }> };
      };
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) throw new Error(`Yahoo v8 ${symbol}: sem preço`);
      return { symbol, price: meta.regularMarketPrice, marketState: meta.marketState ?? "REGULAR" };
    }),
  );

  const map = new Map<string, YahooQuote>();
  for (const r of results) {
    if (r.status === "fulfilled") {
      map.set(r.value.symbol, {
        ticker: r.value.symbol,
        price: r.value.price,
        changePercent: null,
        marketState: r.value.marketState,
      });
    }
  }
  return map;
}

export function toYahooTicker(ticker: string, currency: string): string {
  if (currency === "USD") return ticker;
  if (ticker.endsWith(".SA")) return ticker;
  return `${ticker}.SA`;
}
