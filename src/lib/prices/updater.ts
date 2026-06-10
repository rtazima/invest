import { createServiceClient } from "@/lib/supabase/service";
import { fetchYahooQuotes, toYahooTicker } from "./yahoo";
import { fetchBrapiQuotes } from "./brapi";
import { fetchUsdBrl } from "./fx";

export interface PriceUpdateResult {
  updated: number;
  skipped: number;
  fxRate: number;
  errors: string[];
  fetchedAt: string;
}

type PosData = {
  id: string;
  currency: string;
  current_price: number | null;
  market_value: number | null;
  cost_basis: number | null;
  quantity: number | null;
};

// Tickers que não têm preço de mercado (cash, equivalentes)
const NO_PRICE_TICKERS = new Set(["CASH", "BRL", "USD"]);

function calcNewMarketValue(oldPrice: number | null, oldMv: number | null, newPrice: number, qty: number | null): number {
  if (oldPrice !== null && oldPrice > 0 && oldMv !== null) {
    return oldMv * (newPrice / oldPrice);
  }
  // primeira inicialização com preço real: usa quantidade × preço
  if (qty !== null && qty > 0) {
    return qty * newPrice;
  }
  return oldMv ?? 0;
}

export async function refreshPositionPrices(): Promise<PriceUpdateResult> {
  const supabase = createServiceClient();
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  const { data: positions, error: posErr } = await supabase
    .from("positions")
    .select("id, ticker, currency, current_price, market_value, market_value_brl, cost_basis, quantity")
    .not("ticker", "is", null);

  if (posErr || !positions) {
    return { updated: 0, skipped: 0, fxRate: 0, errors: [posErr?.message ?? "sem posições"], fetchedAt };
  }

  // Separa tickers BRL (→ Brapi) de USD (→ Yahoo)
  const brlTickers = new Map<string, PosData[]>();
  const usdTickers = new Map<string, PosData[]>();
  const fxOnlyPositions: Array<{ id: string; market_value: number }> = [];

  for (const pos of positions) {
    if (!pos.ticker) continue;
    const posData: PosData = {
      id: pos.id,
      currency: pos.currency,
      current_price: pos.current_price !== null ? Number(pos.current_price) : null,
      market_value: pos.market_value !== null ? Number(pos.market_value) : null,
      cost_basis: pos.cost_basis !== null ? Number(pos.cost_basis) : null,
      quantity: pos.quantity !== null ? Number(pos.quantity) : null,
    };

    if (NO_PRICE_TICKERS.has(pos.ticker)) {
      if (pos.currency === "USD") {
        fxOnlyPositions.push({ id: pos.id, market_value: Number(pos.market_value ?? 0) });
      }
      continue;
    }

    if (pos.currency === "BRL") {
      if (!brlTickers.has(pos.ticker)) brlTickers.set(pos.ticker, []);
      brlTickers.get(pos.ticker)!.push(posData);
    } else {
      const yt = toYahooTicker(pos.ticker, pos.currency);
      if (!usdTickers.has(yt)) usdTickers.set(yt, []);
      usdTickers.get(yt)!.push(posData);
    }
  }

  // Busca preços e câmbio em paralelo
  const [brapiQuotes, yahooQuotes, fxRate] = await Promise.all([
    brlTickers.size > 0
      ? fetchBrapiQuotes([...brlTickers.keys()]).catch((e: Error) => {
          errors.push(`Brapi: ${e.message}`);
          return new Map<string, { ticker: string; price: number }>();
        })
      : Promise.resolve(new Map<string, { ticker: string; price: number }>()),
    usdTickers.size > 0
      ? fetchYahooQuotes([...usdTickers.keys()]).catch((e: Error) => {
          errors.push(`Yahoo Finance: ${e.message}`);
          return new Map<string, { price: number; changePercent: number | null; ticker: string; marketState: string }>();
        })
      : Promise.resolve(new Map<string, { price: number; changePercent: number | null; ticker: string; marketState: string }>()),
    fetchUsdBrl().catch((e: Error) => {
      errors.push(`FX rate: ${e.message}`);
      return 0;
    }),
  ]);

  if (fxRate === 0) {
    return { updated: 0, skipped: positions.length, fxRate: 0, errors, fetchedAt };
  }

  let updated = 0;
  let skipped = 0;
  const updatePromises: Promise<void>[] = [];

  // Posições BRL via Brapi
  for (const [ticker, posList] of brlTickers.entries()) {
    const quote = brapiQuotes.get(ticker);
    if (!quote) {
      skipped += posList.length;
      continue;
    }
    const newPrice = quote.price;
    for (const pos of posList) {
      const newMv = calcNewMarketValue(pos.current_price, pos.market_value, newPrice, pos.quantity);
      const costBasis = pos.cost_basis;
      const newPnl = costBasis !== null ? newMv - costBasis : null;
      const newPnlPct = costBasis !== null && costBasis > 0 && newPnl !== null ? newPnl / costBasis : null;

      updatePromises.push(
        Promise.resolve(
          supabase
            .from("positions")
            .update({
              current_price: newPrice,
              market_value: newMv,
              market_value_brl: newMv,
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

  // Posições USD via Yahoo
  for (const [yahooTicker, posList] of usdTickers.entries()) {
    const quote = yahooQuotes.get(yahooTicker);
    if (!quote) {
      skipped += posList.length;
      continue;
    }
    const newPrice = quote.price;
    for (const pos of posList) {
      const newMv = calcNewMarketValue(pos.current_price, pos.market_value, newPrice, pos.quantity);
      const newMvBrl = newMv * fxRate;
      const costBasis = pos.cost_basis;
      const newPnl = costBasis !== null ? newMv - costBasis : null;
      const newPnlPct = costBasis !== null && costBasis > 0 && newPnl !== null ? newPnl / costBasis : null;

      updatePromises.push(
        Promise.resolve(
          supabase
            .from("positions")
            .update({
              current_price: newPrice,
              market_value: newMv,
              market_value_brl: newMvBrl,
              exchange_rate: fxRate,
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

  // Posições USD sem ticker real (CASH, etc.) — só atualiza FX
  const { data: usdNoTicker } = await supabase
    .from("positions")
    .select("id, market_value")
    .eq("currency", "USD")
    .is("ticker", null);

  const allFxOnly = [
    ...fxOnlyPositions,
    ...(usdNoTicker ?? []).map((p) => ({ id: p.id, market_value: Number(p.market_value ?? 0) })),
  ];

  for (const pos of allFxOnly) {
    updatePromises.push(
      Promise.resolve(
        supabase
          .from("positions")
          .update({ market_value_brl: pos.market_value * fxRate, exchange_rate: fxRate })
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
