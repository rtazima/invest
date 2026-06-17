"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

function fmtTimeBrt(isoStr: string): string {
  const d = new Date(isoStr);
  const brtH = (d.getUTCHours() - 3 + 24) % 24;
  return `${String(brtH).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

interface SparkData {
  path: string;
  areaPath: string;
  ys: number[];
}

function buildSparkData(points: HistoryPoint[], liveTotal: number | undefined): SparkData | null {
  const pts = points.map((p) => p.totalBrl);
  if (liveTotal && liveTotal > 0) pts.push(liveTotal);
  if (pts.length < 2) return null;

  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const range = maxV - minV || 1;
  const w = 64;
  const h = 32;
  const n = pts.length;

  const xs = pts.map((_, i) => (i / (n - 1)) * w);
  const ys = pts.map((v) => h - ((v - minV) / range) * (h * 0.8) - h * 0.05);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${(ys[i] ?? 0).toFixed(1)}`).join(" ");

  return { path, areaPath: `${path} L${w},${h} L0,${h} Z`, ys };
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
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const sparkWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portfolio/history?period=D&holder=${holder.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.points) setSparkPoints(data.points as HistoryPoint[]); })
      .catch(() => {});
  }, [holder.id]);

  // Combina histórico com valor live atual
  const allPoints = [...sparkPoints];
  const spark = buildSparkData(sparkPoints, liveTotal);
  const sparkN = allPoints.length + (liveTotal && liveTotal > 0 ? 1 : 0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sparkWrapRef.current || sparkN < 2) return;
    const rect = sparkWrapRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(relX * (sparkN - 1)));
  }, [sparkN]);

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  // Valor e % do ponto hover
  const allValues = [...sparkPoints.map((p) => p.totalBrl), ...(liveTotal && liveTotal > 0 ? [liveTotal] : [])];
  const firstValue = allValues[0] ?? 0;
  const hoveredValue = hoverIdx !== null ? (allValues[hoverIdx] ?? null) : null;
  const hoveredDate = hoverIdx !== null ? (sparkPoints[hoverIdx]?.date ?? null) : null;
  const hoverPct = hoveredValue !== null && firstValue > 0
    ? ((hoveredValue - firstValue) / firstValue) * 100
    : null;
  const hoverPositive = (hoverPct ?? 0) >= 0;

  const hoverX_svg = hoverIdx !== null && sparkN > 1 ? (hoverIdx / (sparkN - 1)) * 64 : null;
  const hoverY_svg = hoverIdx !== null && spark ? (spark.ys[hoverIdx] ?? null) : null;

  const initials = holder.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
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
        <div style={{
          width: "20px", height: "20px", borderRadius: "50%", backgroundColor: color,
          display: "grid", placeItems: "center", fontSize: "10px", fontWeight: 500,
          color: "var(--color-bg)", flexShrink: 0,
        }}>
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

      {/* Sparkline com hover */}
      <div
        ref={sparkWrapRef}
        style={{ margin: "auto -16px -16px", marginTop: "4px", position: "relative", cursor: sparkN >= 2 ? "crosshair" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Tooltip hover */}
        {hoverIdx !== null && hoveredValue !== null && (
          <div style={{
            position: "absolute",
            bottom: "44px",
            left: hoverIdx / (sparkN - 1) < 0.4 ? "8px" : "auto",
            right: hoverIdx / (sparkN - 1) >= 0.4 ? "8px" : "auto",
            backgroundColor: "var(--color-bg-3)",
            border: "1px solid var(--color-line)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "10.5px",
            pointerEvents: "none",
            zIndex: 10,
            lineHeight: "1.5",
            whiteSpace: "nowrap",
          }}>
            {hoveredDate && (
              <div style={{ color: "var(--color-text-3)" }}>{fmtTimeBrt(hoveredDate)}</div>
            )}
            <div className="num" style={{ fontWeight: 500 }}>
              R$ {hoveredValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {hoverPct !== null && (
              <div className="num" style={{ color: hoverPositive ? "var(--color-gain)" : "var(--color-loss)" }}>
                {hoverPositive ? "+" : "−"}{Math.abs(hoverPct).toFixed(2)}%
              </div>
            )}
          </div>
        )}

        <svg viewBox="0 0 64 32" width="100%" height="40" preserveAspectRatio="none">
          {spark ? (
            <>
              <path d={spark.areaPath} fill={`color-mix(in oklch, ${color} 14%, transparent)`} />
              <path d={spark.path} fill="none" stroke={color} strokeWidth="1.25" />
              {hoverX_svg !== null && hoverY_svg !== null ? (
                <>
                  <line
                    x1={hoverX_svg} y1="0" x2={hoverX_svg} y2="32"
                    stroke={color} strokeWidth="0.75" strokeDasharray="2 2" strokeOpacity="0.6"
                  />
                  <circle cx={hoverX_svg} cy={hoverY_svg} r="2.5" fill={color} />
                </>
              ) : null}
            </>
          ) : (
            <line x1="0" y1="16" x2="64" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
          )}
        </svg>
      </div>
    </div>
  );
}
