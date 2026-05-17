"use client";

import { useState } from "react";
import type { ClientPortfolioSummary } from "./types";

const PERIODS = ["1D", "1S", "1M", "6M", "1A", "MAX"] as const;
type Period = (typeof PERIODS)[number];

function fmtBrl(n: number): [string, string] {
  const s = n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [int = "0", dec = "00"] = s.split(",");
  return [int, `,${dec}`];
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function demoPath(total: number): { main: string; cdi: string } {
  const h = 150;
  const w = 720;
  const n = 13;
  const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * w);

  const growth = [1, 1.02, 1.045, 1.038, 1.055, 1.04, 1.07, 1.062, 1.083, 1.091, 1.105, 1.118, 1.13];
  const maxG = Math.max(...growth);
  const minG = Math.min(...growth);
  const mainYs = growth.map((g) => h - ((g - minG) / (maxG - minG)) * (h * 0.75) - h * 0.1);

  const cdiG = Array.from({ length: n }, (_, i) => 1 + (i / (n - 1)) * 0.104);
  const maxC = Math.max(...cdiG);
  const minC = Math.min(...cdiG);
  const cdiYs = cdiG.map((g) => h - ((g - minC) / (maxC - minC)) * (h * 0.55) - h * 0.1);

  const toPath = (ys: number[]) =>
    xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${(ys[i] ?? 0).toFixed(1)}`).join(" ");

  void total;
  return { main: toPath(mainYs), cdi: toPath(cdiYs) };
}

function demoAxisLabels(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return MONTHS[d.getMonth()] ?? "";
  });
}

interface Props {
  summary: ClientPortfolioSummary;
}

export function PortfolioHeroCard({ summary }: Props) {
  const [period, setPeriod] = useState<Period>("6M");
  const [int, dec] = fmtBrl(summary.totalBrl);
  const { main, cdi } = demoPath(summary.totalBrl);
  const axisLabels = demoAxisLabels();

  const holderCount = summary.byHolder.length;
  const instCount = Object.keys(summary.byInstitution).length;

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

        {/* Period switcher */}
        <div
          style={{
            display: "flex",
            border: "1px solid var(--color-line)",
            borderRadius: "6px",
            padding: "2px",
            gap: "1px",
          }}
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                backgroundColor: period === p ? "var(--color-bg-3)" : "transparent",
                color: period === p ? "var(--color-text)" : "var(--color-text-3)",
                transition: "background-color 0.1s, color 0.1s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Valor principal */}
      <div style={{ marginBottom: "8px" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
          <span className="num" style={{ fontSize: "14px", color: "var(--color-text-3)" }}>R$</span>
          <span className="num" style={{ fontSize: "44px", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {int}
          </span>
          <span className="num" style={{ fontSize: "28px", color: "var(--color-text-3)" }}>{dec}</span>
        </span>
      </div>

      {/* Sub-linha de performance */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "12.5px" }}>
        <span>
          <span style={{ color: "var(--color-text-3)" }}>Hoje</span>
          {" · "}
          <span className="num" style={{ color: "var(--color-gain)" }}>+R$ 4.812,30</span>
          {" · "}
          <span className="num" style={{ color: "var(--color-gain)" }}>+0,41%</span>
        </span>
        <span style={{ width: "1px", height: "12px", backgroundColor: "var(--color-line)" }} />
        <span>
          <span style={{ color: "var(--color-text-3)" }}>30d</span>
          {" · "}
          <span className="num" style={{ color: "var(--color-gain)" }}>+R$ 28.140,12</span>
          {" · "}
          <span className="num" style={{ color: "var(--color-gain)" }}>+2,43%</span>
        </span>
        <span style={{ width: "1px", height: "12px", backgroundColor: "var(--color-line)" }} />
        <span>
          <span style={{ color: "var(--color-text-3)" }}>12m</span>
          {" · "}
          <span className="num" style={{ color: "var(--color-gain)" }}>+11,82%</span>
          {" · "}
          <span className="num" style={{ color: "var(--color-text-3)" }}>vs CDI {fmt(10.4)}%</span>
        </span>
      </div>

      {/* Gráfico SVG */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox="0 0 720 170"
          width="100%"
          height="170"
          preserveAspectRatio="none"
          style={{ display: "block", overflow: "visible" }}
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

          {/* CDI benchmark */}
          <path d={cdi} fill="none" stroke="oklch(0.5 0 0)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Área de preenchimento */}
          <path d={`${main} L720,170 L0,170 Z`} fill="url(#hero-fill)" />

          {/* Linha principal */}
          <path d={main} fill="none" stroke="var(--color-gain)" strokeWidth="1.6" />

          {/* Dot final */}
          <circle cx="720" cy="60" r="6" fill="var(--color-gain)" fillOpacity="0.25" />
          <circle cx="720" cy="60" r="3" fill="var(--color-gain)" />

          {/* Labels eixo X */}
          {axisLabels.map((label, i) => (
            <text
              key={label}
              x={(i / (axisLabels.length - 1)) * 720}
              y="165"
              textAnchor={i === 0 ? "start" : i === axisLabels.length - 1 ? "end" : "middle"}
              fontSize="10.5"
              fill="var(--color-text-3)"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
