"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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

// Debounce: um refresh de preços atualiza 30+ posições em sequência.
// Aguarda 800ms após o último evento antes de buscar o resumo agregado.
const DEBOUNCE_MS = 800;

export function LivePriceProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LivePrices | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/prices/current", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as LivePrices;
      setLive(data);
    } catch {
      // falha silenciosa
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial
    void fetchCurrent();

    const supabase = createClient();

    const channel = supabase
      .channel("positions-price-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "positions" },
        () => {
          setRefreshing(true);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => void fetchCurrent(), DEBOUNCE_MS);
        },
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [fetchCurrent]);

  return (
    <Ctx.Provider value={{ live, refreshing, liveFxRate: live?.fxRate ?? null }}>
      {children}
    </Ctx.Provider>
  );
}
