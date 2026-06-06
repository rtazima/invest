export interface YahooQuote {
  ticker: string;
  price: number;
  changePercent: number | null;
  marketState: string;
}

export async function fetchYahooQuotes(tickers: string[]): Promise<Map<string, YahooQuote>> {
  if (tickers.length === 0) return new Map();

  const symbols = tickers.join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent,marketState`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);

  const data = (await res.json()) as {
    quoteResponse?: {
      result?: Array<{
        symbol: string;
        regularMarketPrice: number;
        regularMarketChangePercent?: number;
        marketState: string;
      }>;
    };
  };

  const map = new Map<string, YahooQuote>();
  for (const q of data.quoteResponse?.result ?? []) {
    map.set(q.symbol, {
      ticker: q.symbol,
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent ?? null,
      marketState: q.marketState,
    });
  }
  return map;
}

export function toYahooTicker(ticker: string, currency: string): string {
  if (currency === "USD") return ticker;
  if (ticker.endsWith(".SA")) return ticker;
  return `${ticker}.SA`;
}
