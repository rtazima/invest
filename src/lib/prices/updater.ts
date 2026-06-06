import { createServiceClient } from "@/lib/supabase/service";
import { fetchYahooQuotes, toYahooTicker } from "./yahoo";
import { fetchUsdBrl } from "./fx";

export interface PriceUpdateResult {
  updated: number;
  skipped: number;
  fxRate: number;
  errors: string[];
  fetchedAt: string;
}

export async function refreshPositionPrices(): Promise<PriceUpdateResult> {
  const supabase = createServiceClient();
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  // Busca todas as posições com ticker (de qualquer batch — atualizamos todas)
  const { data: positions, error: posErr } = await supabase
    .from("positions")
    .select("id, ticker, currency, current_price, market_value, market_value_brl, cost_basis")
    .not("ticker", "is", null);

  if (posErr || !positions) {
    return { updated: 0, skipped: 0, fxRate: 0, errors: [posErr?.message ?? "sem posições"], fetchedAt };
  }

  // Coleta tickers únicos e monta mapa yahoo_ticker → posições
  const tickerToPositions = new Map<
    string,
    Array<{ id: string; currency: string; current_price: number | null; market_value: number | null; cost_basis: number | null }>
  >();

  for (const pos of positions) {
    if (!pos.ticker) continue;
    const yt = toYahooTicker(pos.ticker, pos.currency);
    if (!tickerToPositions.has(yt)) tickerToPositions.set(yt, []);
    tickerToPositions.get(yt)!.push({
      id: pos.id,
      currency: pos.currency,
      current_price: pos.current_price !== null ? Number(pos.current_price) : null,
      market_value: pos.market_value !== null ? Number(pos.market_value) : null,
      cost_basis: pos.cost_basis !== null ? Number(pos.cost_basis) : null,
    });
  }

  // Busca quotes e câmbio em paralelo
  const allYahooTickers = [...tickerToPositions.keys()];
  const [quotes, fxRate] = await Promise.all([
    fetchYahooQuotes(allYahooTickers).catch((e: Error) => {
      errors.push(`Yahoo Finance: ${e.message}`);
      return new Map<string, { price: number; changePercent: number | null; ticker: string; marketState: string }>();
    }),
    fetchUsdBrl().catch((e: Error) => {
      errors.push(`FX rate: ${e.message}`);
      return 0;
    }),
  ]);

  if (fxRate === 0) {
    return { updated: 0, skipped: positions.length, fxRate: 0, errors, fetchedAt };
  }

  // Atualiza posições com ticker que têm quote
  let updated = 0;
  let skipped = 0;

  const updatePromises: Promise<void>[] = [];

  for (const [yahooTicker, posList] of tickerToPositions.entries()) {
    const quote = quotes.get(yahooTicker);
    if (!quote) {
      skipped += posList.length;
      continue;
    }

    const newPrice = quote.price;

    for (const pos of posList) {
      const oldPrice = pos.current_price;
      const oldMarketValue = pos.market_value;

      // Calcula novo market_value na moeda original via ratio
      let newMarketValue: number;
      if (oldPrice !== null && oldPrice > 0 && oldMarketValue !== null) {
        newMarketValue = oldMarketValue * (newPrice / oldPrice);
      } else {
        // Primeira atualização: não tem preço anterior — seta current_price mas não altera market_value
        newMarketValue = oldMarketValue ?? 0;
      }

      const newMarketValueBrl = pos.currency === "USD" ? newMarketValue * fxRate : newMarketValue;

      // Recalcula PnL se tiver cost_basis
      const costBasis = pos.cost_basis;
      const newPnl = costBasis !== null ? newMarketValue - costBasis : null;
      const newPnlPct = costBasis !== null && costBasis > 0 && newPnl !== null ? newPnl / costBasis : null;

      updatePromises.push(
        Promise.resolve(
          supabase
            .from("positions")
            .update({
              current_price: newPrice,
              market_value: newMarketValue,
              market_value_brl: newMarketValueBrl,
              ...(pos.currency === "USD" ? { exchange_rate: fxRate } : {}),
              ...(newPnl !== null ? { pnl: newPnl, pnl_pct: newPnlPct } : {}),
            })
            .eq("id", pos.id),
        ).then(({ error }) => {
          if (error) errors.push(`pos ${pos.id}: ${error.message}`);
          else updated++;
        }),
      );
    }
  }

  // Atualiza posições USD sem ticker (caixa, liquidez) só pelo câmbio
  const { data: usdNoTicker } = await supabase
    .from("positions")
    .select("id, market_value")
    .eq("currency", "USD")
    .is("ticker", null);

  for (const pos of usdNoTicker ?? []) {
    const mv = Number(pos.market_value ?? 0);
    updatePromises.push(
      Promise.resolve(
        supabase
          .from("positions")
          .update({ market_value_brl: mv * fxRate, exchange_rate: fxRate })
          .eq("id", pos.id),
      ).then(({ error }) => {
        if (error) errors.push(`pos ${pos.id} (fx-only): ${error.message}`);
        else updated++;
      }),
    );
  }

  await Promise.all(updatePromises);

  return { updated, skipped, fxRate, errors, fetchedAt };
}
