"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export interface LivePrices {
  totalBrl: number;
  byHolder: { id: string; totalBrl: number }[];
  fxRate: number | null;
  updatedAt: string | null;
}

interface LivePriceCtx {
  live: LivePrices | null;
  refreshing: boolean;
  liveFxRate: number | null;
}

const Ctx = createContext<LivePriceCtx>({ live: null, refreshing: false, liveFxRate: null });

export function useLivePrices() {
  return useContext(Ctx);
}

const DISPLAY_INTERVAL = 3_000;  // lê do DB a cada 3s
const YAHOO_INTERVAL   = 30_000; // busca Yahoo a cada 30s
const FX_INTERVAL      = 30_000; // busca câmbio a cada 30s (independente do Yahoo)

export function LivePriceProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LivePrices | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [liveFxRate, setLiveFxRate] = useState<number | null>(null);
  const yahooTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/prices/current", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as LivePrices;
      setLive(data);
    } catch {
      // falha silenciosa
    }
  }, []);

  // FX independente do Yahoo — nunca trava por falha do Yahoo Finance
  const fetchFx = useCallback(async () => {
    try {
      const res = await fetch("/api/prices/fx", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { rate?: number };
      if (data.rate && data.rate > 0) setLiveFxRate(data.rate);
    } catch {
      // falha silenciosa
    }
  }, []);

  const refreshYahoo = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/prices/refresh", { method: "POST", cache: "no-store" });
      await fetchCurrent();
    } catch {
      // falha silenciosa
    } finally {
      setRefreshing(false);
    }
  }, [fetchCurrent]);

  useEffect(() => {
    // Busca câmbio e preços imediatamente no mount
    fetchFx();
    fetchCurrent();
    refreshYahoo();

    // Loop FX: a cada 30s, independente do Yahoo
    function scheduleFx() {
      fxTimer.current = setTimeout(async () => {
        await fetchFx();
        scheduleFx();
      }, FX_INTERVAL);
    }
    scheduleFx();

    // Loop de display: a cada 3s, só lê do DB
    function scheduleDisplay() {
      displayTimer.current = setTimeout(async () => {
        await fetchCurrent();
        scheduleDisplay();
      }, DISPLAY_INTERVAL);
    }
    scheduleDisplay();

    // Loop Yahoo: a cada 30s
    function scheduleYahoo() {
      yahooTimer.current = setTimeout(async () => {
        await refreshYahoo();
        scheduleYahoo();
      }, YAHOO_INTERVAL);
    }
    scheduleYahoo();

    return () => {
      if (fxTimer.current) clearTimeout(fxTimer.current);
      if (displayTimer.current) clearTimeout(displayTimer.current);
      if (yahooTimer.current) clearTimeout(yahooTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Ctx.Provider value={{ live, refreshing, liveFxRate }}>{children}</Ctx.Provider>;
}
