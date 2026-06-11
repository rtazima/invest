"use client";

import { useEffect, useState } from "react";
import type { ClientHolderSummary } from "./types";
import { useFlash } from "@/hooks/useFlash";
import type { HistoryPoint } from "@/app/api/portfolio/history/route";

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

const HOLDER_METAS: Record<string, string> = {
  rodrigo: "renda passiva",
  grasi: "liq. 30d ok",
  amora: "R$12k/mês 18a",
  benicio: "R$12k/mês 18a",
};

const RISK_LABELS: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Arrojado",
};

function fmtBrl(n: number): [string, string] {
  const s = n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [int = "0", dec = "00"] = s.split(",");
  return [int, `,${dec}`];
}

function buildSparkPath(points: HistoryPoint[], liveTotal: number | undefined): string | null {
  const pts = points.map((p) => p.totalBrl);
  if (liveTotal && liveTotal > 0) pts.push(liveTotal);
  if (pts.length < 2) return null;

  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const range = maxV - minV || 1;
  const w = 64;
  const h = 32;

  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - minV) / range) * (h * 0.8) - h * 0.05;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

interface Props {
  holder: ClientHolderSummary;
  liveTotal?: number;
  todayPct?: number;
}

export function HolderCard({ holder, liveTotal, todayPct = 0 }: Props) {
  const color = HOLDER_COLORS[holder.slug] ?? "var(--color-brand)";
  const meta = HOLDER_METAS[holder.slug] ?? "";
  const displayTotal = liveTotal ?? holder.totalBrl;
  const flash = useFlash(displayTotal);
  const [int, dec] = fmtBrl(displayTotal);
  const positive = todayPct >= 0;

  const [sparkPoints, setSparkPoints] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    fetch(`/api/portfolio/history?period=M&holder=${holder.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.points) setSparkPoints(data.points as HistoryPoint[]);
      })
      .catch(() => {});
  }, [holder.id]);

  const spark = buildSparkPath(sparkPoints, liveTotal);

  const initials = holder.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const riskLabel = RISK_LABELS[holder.riskProfile ?? ""] ?? null;

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: color,
            display: "grid",
            placeItems: "center",
            fontSize: "10px",
            fontWeight: 500,
            color: "var(--color-bg)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <span style={{ fontSize: "12.5px", fontWeight: 500 }}>{holder.name}</span>
        {riskLabel && (
          <span style={{ fontSize: "10.5px", color: "var(--color-text-3)", marginLeft: "auto" }}>
            {riskLabel}
          </span>
        )}
      </div>

      {/* Patrimônio */}
      <div className={flash ? `flash-${flash}` : ""} style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
        <span className="num pv" style={{ fontSize: "20px", letterSpacing: "-0.015em", fontWeight: 500 }}>{int}</span>
        <span className="num pv" style={{ fontSize: "14px", color: "var(--color-text-3)" }}>{dec}</span>
      </div>

      {/* Sub-linha */}
      <div className="num" style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: positive ? "var(--color-gain)" : "var(--color-loss)" }}>
          {positive ? "+" : "−"}{Math.abs(todayPct).toFixed(2)}%
        </span>
        {meta && <span style={{ color: "var(--color-text-3)" }}>{meta}</span>}
      </div>

      {/* Sparkline */}
      <div style={{ margin: "auto -16px -16px", marginTop: "4px" }}>
        <svg viewBox="0 0 64 32" width="100%" height="40" preserveAspectRatio="none">
          {spark ? (
            <>
              <path
                d={`${spark} L64,32 L0,32 Z`}
                fill={`color-mix(in oklch, ${color} 14%, transparent)`}
              />
              <path d={spark} fill="none" stroke={color} strokeWidth="1.25" />
            </>
          ) : (
            <line x1="0" y1="16" x2="64" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
          )}
        </svg>
      </div>
    </div>
  );
}
