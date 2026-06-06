"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function PriceRefresher() {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function doRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/prices/refresh", { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { fxRate?: number };
        setLastRefresh(new Date());
        if (data.fxRate) setFxRate(data.fxRate);
        router.refresh();
      }
    } catch {
      // falha silenciosa — tentará novamente no próximo ciclo
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    doRefresh();

    function schedule() {
      timerRef.current = setTimeout(() => {
        doRefresh().then(schedule);
      }, REFRESH_INTERVAL_MS);
    }
    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lastRefresh && !refreshing) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        color: "var(--color-text-3)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: refreshing ? "var(--color-warning)" : "var(--color-success)",
          flexShrink: 0,
        }}
      />
      {refreshing ? (
        <span>Atualizando preços...</span>
      ) : (
        <span>
          {fxRate && `USD/BRL ${fxRate.toFixed(2)} · `}
          {lastRefresh && `${lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
        </span>
      )}
    </div>
  );
}
