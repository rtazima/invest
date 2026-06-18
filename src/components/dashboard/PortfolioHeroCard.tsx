"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { ClientPortfolioSummary } from "./types";
import { useFlash } from "@/hooks/useFlash";
import type { HistoryPoint, HistoryPeriod } from "@/app/api/portfolio/history/route";

const PERIODS: HistoryPeriod[] = ["D", "S", "M", "A", "MAX"];

const PERIOD_STAT_LABEL: Record<HistoryPeriod, string> = {
  D: "Hoje",
  S: "7 dias",
  M: "30 dias",
  A: "12 meses",
  MAX: "Histórico",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtBrl(n: number): [string, string] {
  const s = n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [int = "0", dec = "00"] = s.split(",");
  return [int, `,${dec}`];
}

function fmtN(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAbs(n: number): string {
  return Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTimeBrt(isoStr: string): string {
  const d = new Date(isoStr);
  const brtH = (d.getUTCHours() - 3 + 24) % 24;
  return `${String(brtH).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function fmtPointLabel(pt: HistoryPoint, period: HistoryPeriod): string {
  if (period === "D") return fmtTimeBrt(pt.date);
  const d = new Date(`${pt.date}T12:00:00Z`);
  if (period === "A" || period === "MAX")
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface ChartData {
  main: string;
  area: string;
  lastX: number;
  lastY: number;
  ys: number[];
}

function buildPath(points: { totalBrl: number }[], w = 720, h = 150): ChartData | null {
  if (points.length < 2) return null;
  const values = points.map((p) => p.totalBrl);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const n = points.length;
  const xs = points.map((_, i) => (i / (n - 1)) * w);
  const ys = values.map((v) => h - ((v - minV) / range) * (h * 0.75) - h * 0.125);
  const main = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${(ys[i] ?? 0).toFixed(1)}`).join(" ");
  const lastX = xs[n - 1] ?? w;
  const lastY = ys[n - 1] ?? h * 0.5;
  return { main, area: `${main} L${lastX.toFixed(1)},${h} L0,${h} Z`, lastX, lastY, ys };
}

function buildAxisLabels(points: HistoryPoint[], period: HistoryPeriod): { label: string; x: number }[] {
  if (points.length < 2) return [];
  const w = 720;
  const n = points.length;
  const count = Math.min(period === "D" ? 8 : 6, n);
  const indices = Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * (n - 1)));
  const seen = new Set<number>();
  const result: { label: string; x: number }[] = [];
  for (const idx of indices) {
    if (seen.has(idx)) continue;
    seen.add(idx);
    const pt = points[idx];
    if (!pt) continue;
    let label: string;
    if (period === "D") {
      label = fmtTimeBrt(pt.date);
    } else {
      const d = new Date(`${pt.date}T12:00:00Z`);
      label = (period === "A" || period === "MAX")
        ? `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`
        : `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    result.push({ label, x: (idx / (n - 1)) * w });
  }
  return result;
}

interface Props {
  summary: ClientPortfolioSummary;
  liveTotal?: number;
  totalUsd?: number;
  liveFxRate?: number | null;
  period: HistoryPeriod;
  onPeriodChange: (p: HistoryPeriod) => void;
  onHoveredDateChange?: (date: string | null) => void;
}

export function PortfolioHeroCard({ summary, liveTotal, totalUsd, liveFxRate, period, onPeriodChange, onHoveredDateChange }: Props) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  const displayTotal = liveTotal ?? summary.totalBrl;
  const flash = useFlash(displayTotal);
  const [int, dec] = fmtBrl(displayTotal);

  const holderCount = summary.byHolder.length;
  const instCount = Object.keys(summary.byInstitution).length;

  useEffect(() => {
    setLoading(true);
    setHoverIdx(null);
    fetch(`/api/portfolio/history?period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.points) setHistory(data.points as HistoryPoint[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const chartPoints = useMemo<HistoryPoint[]>(() => {
    const todayStr = new Date().toISOString().split("T")[0]!;
    const pts = period === "D"
      ? history.filter((p) => !p.date.startsWith(todayStr) || p.date.length > 10)
      : history.filter((p) => p.date !== todayStr);
    if (displayTotal > 0) pts.push({ date: new Date().toISOString(), totalBrl: displayTotal });
    return pts;
  }, [history, displayTotal, period]);

  const chart = buildPath(chartPoints);
  const axisLabels = buildAxisLabels(chartPoints, period);
  const n = chartPoints.length;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartWrapRef.current || n < 2) return;
    const rect = chartWrapRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (n - 1));
    setHoverIdx(idx);
    onHoveredDateChange?.(chartPoints[idx]?.date ?? null);
  }, [n, chartPoints, onHoveredDateChange]);

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
    onHoveredDateChange?.(null);
  }, [onHoveredDateChange]);

  // Stats: usa ponto hover se existir, senão usa período completo
  const firstValue = chartPoints[0]?.totalBrl ?? 0;
  const activeIdx = hoverIdx ?? (n > 0 ? n - 1 : null);
  const activeValue = activeIdx !== null ? (chartPoints[activeIdx]?.totalBrl ?? displayTotal) : displayTotal;
  const absChange = activeValue - firstValue;
  const pctChange = firstValue > 0 ? (absChange / firstValue) * 100 : 0;
  const positive = pctChange >= 0;
  const hasStats = n >= 2 && firstValue > 0;

  const hoverX_svg = hoverIdx !== null && n > 1 ? (hoverIdx / (n - 1)) * 720 : null;
  const hoverY_svg = hoverIdx !== null && chart ? (chart.ys[hoverIdx] ?? chart.lastY) : null;
  const activePoint = activeIdx !== null ? chartPoints[activeIdx] : null;

  return (
    <div
      style={{
        gridColumn: "span 7",
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-3)" }}>
            Patrimônio total
          </span>
          <span className="pill">
            <span className="dot" style={{ backgroundColor: "var(--color-gain)" }} />
            {holderCount} titular{holderCount !== 1 ? "es" : ""} · {instCount} instituiç{instCount !== 1 ? "ões" : "ão"}
          </span>
        </div>
        <div style={{ display: "flex", border: "1px solid var(--color-line)", borderRadius: "6px", padding: "2px", gap: "1px" }}>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              style={{
                padding: "2px 8px", borderRadius: "4px", fontSize: "11.5px", fontWeight: 500,
                border: "none", cursor: "pointer",
                backgroundColor: period === p ? "var(--color-bg-3)" : "transparent",
                color: period === p ? "var(--color-text)" : "var(--color-text-3)",
                transition: "background-color 0.1s, color 0.1s",
              }}
            >
              {p === "MAX" ? "+" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Valor principal */}
      <div style={{ marginBottom: "8px" }}>
        <span className={flash ? `flash-${flash}` : ""} style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
          <span className="num pv" style={{ fontSize: "14px", color: "var(--color-text-3)" }}>R$</span>
          <span className="num pv" style={{ fontSize: "44px", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}>{int}</span>
          <span className="num pv" style={{ fontSize: "28px", color: "var(--color-text-3)" }}>{dec}</span>
        </span>
        {totalUsd != null && totalUsd > 0 && (
          <div className="num pv" style={{ fontSize: "14px", color: "var(--color-text-3)", marginTop: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>USD {totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {liveFxRate != null && (
              <span style={{ fontSize: "11px" }}>@ {liveFxRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
            )}
          </div>
        )}
      </div>

      {/* Sub-linha: stats do período ou do ponto hover */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "12.5px", minHeight: "18px" }}>
        {hasStats ? (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--color-text-3)" }}>
              {hoverIdx !== null && activePoint
                ? fmtPointLabel(activePoint, period)
                : PERIOD_STAT_LABEL[period]}
            </span>
            {hoverIdx !== null && activePoint ? (
              <span className="num" style={{ color: "var(--color-text)" }}>R$ {fmtN(activePoint.totalBrl)}</span>
            ) : null}
            <span style={{ width: "1px", height: "12px", backgroundColor: "var(--color-line)" }} />
            <span className="num" style={{ color: positive ? "var(--color-gain)" : "var(--color-loss)" }}>
              {positive ? "+" : "−"}R$ {fmtAbs(absChange)}
            </span>
            <span className="num" style={{ color: positive ? "var(--color-gain)" : "var(--color-loss)" }}>
              {positive ? "+" : "−"}{Math.abs(pctChange).toFixed(2)}%
            </span>
          </span>
        ) : (
          <span style={{ color: "var(--color-text-3)", fontSize: "12px" }}>
            {loading ? "carregando histórico…" : "sem histórico para o período"}
          </span>
        )}
      </div>

      {/* Gráfico SVG */}
      <div
        ref={chartWrapRef}
        style={{ position: "relative", cursor: n >= 2 ? "crosshair" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          viewBox="0 0 720 170"
          width="100%"
          height="170"
          preserveAspectRatio="none"
          style={{ display: "block", overflow: "visible", opacity: loading ? 0.4 : 1, transition: "opacity 0.2s" }}
        >
          <defs>
            <pattern id="grid-bg" width="60" height="34" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 34" fill="none" stroke="oklch(0.235 0 0)" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gain)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--color-gain)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width="720" height="170" fill="url(#grid-bg)" />

          {chart ? (
            <>
              <path d={chart.area} fill="url(#hero-fill)" />
              <path d={chart.main} fill="none" stroke="var(--color-gain)" strokeWidth="1.6" />

              {/* Crosshair no hover */}
              {hoverX_svg !== null && hoverY_svg !== null ? (
                <>
                  <line
                    x1={hoverX_svg} y1="0" x2={hoverX_svg} y2="150"
                    stroke="var(--color-text-3)" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6"
                  />
                  <circle cx={hoverX_svg} cy={hoverY_svg} r="5" fill="var(--color-gain)" fillOpacity="0.2" />
                  <circle cx={hoverX_svg} cy={hoverY_svg} r="3" fill="var(--color-gain)" />
                </>
              ) : (
                <>
                  <circle cx={chart.lastX} cy={chart.lastY} r="6" fill="var(--color-gain)" fillOpacity="0.25" />
                  <circle cx={chart.lastX} cy={chart.lastY} r="3" fill="var(--color-gain)" />
                </>
              )}
            </>
          ) : (
            !loading && (
              <line x1="0" y1="85" x2="720" y2="85" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="4 4" />
            )
          )}

          {/* Labels eixo X */}
          {axisLabels.map(({ label, x }, i) => (
            <text
              key={i} x={x} y="165"
              textAnchor={x < 20 ? "start" : x > 700 ? "end" : "middle"}
              fontSize="10.5" fill="var(--color-text-3)" fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
