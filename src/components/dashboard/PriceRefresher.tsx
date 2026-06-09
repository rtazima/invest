"use client";

import { useLivePrices } from "@/lib/prices/live-context";

export function PriceRefresher() {
  const { live, refreshing, liveFxRate } = useLivePrices();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        color: "var(--color-text-3)",
        marginBottom: "8px",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: refreshing
            ? "var(--color-warning, #f59e0b)"
            : live
              ? "var(--color-success, #22c55e)"
              : "var(--color-text-3)",
          flexShrink: 0,
          transition: "background-color 0.3s",
        }}
      />
      {refreshing ? (
        <span>Atualizando...</span>
      ) : live ? (
        <span>
          {liveFxRate != null && `USD/BRL ${liveFxRate.toFixed(2)} · `}
          {new Date(live.updatedAt ?? "").toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      ) : null}
    </div>
  );
}
