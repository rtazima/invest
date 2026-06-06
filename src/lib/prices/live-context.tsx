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
}

const Ctx = createContext<LivePriceCtx>({ live: null, refreshing: false });

export function useLivePrices() {
  return useContext(Ctx);
}

const DISPLAY_INTERVAL = 3_000;  // lê do DB a cada 3s
const YAHOO_INTERVAL   = 30_000; // busca Yahoo a cada 30s

export function LivePriceProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LivePrices | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const yahooTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // Primeira carga: busca Yahoo imediatamente
    refreshYahoo();

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
      if (displayTimer.current) clearTimeout(displayTimer.current);
      if (yahooTimer.current) clearTimeout(yahooTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Ctx.Provider value={{ live, refreshing }}>{children}</Ctx.Provider>;
}
