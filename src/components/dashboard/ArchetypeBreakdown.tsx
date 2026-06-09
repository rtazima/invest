"use client";

import { useState } from "react";
import { ARCHETYPE_LABELS, ARCHETYPE_COLORS } from "@/lib/analysis/types";
import { FII_TYPE_LABELS, FII_TYPE_COLORS } from "@/lib/analysis/fii-types";
import type { ClientPosition, ClientHolderSummary } from "./types";

const ALL_LABELS: Record<string, string> = { ...ARCHETYPE_LABELS, ...FII_TYPE_LABELS };
const ALL_COLORS: Record<string, string> = { ...ARCHETYPE_COLORS, ...FII_TYPE_COLORS };

const CIRCUMFERENCE = 2 * Math.PI * 54;

function fmtBrl(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Segment {
  archetype: string;
  total: number;
  pct: number;
  label: string;
  color: string;
  arc: number;
  dashOffset: number;
}

function buildSegments(positions: ClientPosition[]): { segments: Segment[]; total: number } {
  const map = new Map<string, number>();
  for (const p of positions) {
    const key = p.archetype ?? "sem_tipo";
    map.set(key, (map.get(key) ?? 0) + p.market_value_brl);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  const entries = [...map.entries()]
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  let offset = 0;
  const segments: Segment[] = entries.map(([archetype, t]) => {
    const pct = total > 0 ? t / total : 0;
    const arc = pct * CIRCUMFERENCE;
    const dashOffset = CIRCUMFERENCE - offset;
    offset += arc;
    return {
      archetype,
      total: t,
      pct,
      label: ALL_LABELS[archetype] ?? archetype,
      color: ALL_COLORS[archetype] ?? "oklch(0.55 0.04 240)",
      arc,
      dashOffset,
    };
  });

  return { segments, total };
}

interface DonutChartProps {
  title: string;
  positions: ClientPosition[];
  portfolioTotal: number;
}

function DonutChart({ title, positions, portfolioTotal }: DonutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { segments, total } = buildSegments(positions);

  if (segments.length === 0) return null;

  const sectionPct = portfolioTotal > 0 ? (total / portfolioTotal) * 100 : 0;
  const hoveredSeg = segments.find((s) => s.archetype === hovered);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: "12px" }}>
        <span style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-text-3)",
        }}>
          {title}
        </span>
        <span style={{ fontSize: "11px", color: "var(--color-text-3)", marginLeft: "8px" }} className="num">
          {fmtBrl(total)} · {sectionPct.toFixed(1)}% do portfólio
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Donut */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg viewBox="-80 -80 160 160" width="130" height="130">
            <circle r="54" fill="none" stroke="var(--color-line)" strokeWidth="18" />
            {segments.map((seg) => (
              <circle
                key={seg.archetype}
                r="54"
                fill="none"
                stroke={seg.color}
                strokeWidth={hovered === seg.archetype ? 26 : 18}
                strokeDasharray={`${seg.arc.toFixed(2)} ${(CIRCUMFERENCE - seg.arc).toFixed(2)}`}
                strokeDashoffset={seg.dashOffset.toFixed(2)}
                transform="rotate(-90)"
                style={{ transition: "stroke-width 0.15s ease", cursor: "pointer" }}
                onMouseEnter={() => setHovered(seg.archetype)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
          {/* Centro */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}>
            {hoveredSeg ? (
              <>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }} className="num">
                  {(hoveredSeg.pct * 100).toFixed(1)}%
                </span>
                <span style={{ fontSize: "9px", color: "var(--color-text-3)", textAlign: "center", maxWidth: "56px" }}>
                  {hoveredSeg.label}
                </span>
              </>
            ) : (
              <span style={{ fontSize: "11px", color: "var(--color-text-3)" }} className="num">
                {segments.length} tipos
              </span>
            )}
          </div>
        </div>

        {/* Legenda */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
          {segments.map((seg) => (
            <li
              key={seg.archetype}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", cursor: "default" }}
              onMouseEnter={() => setHovered(seg.archetype)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: seg.color,
                flexShrink: 0,
              }} />
              <span style={{ color: hovered === seg.archetype ? "var(--color-text)" : "var(--color-text-2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {seg.label}
              </span>
              <span className="num" style={{ color: "var(--color-text-3)", flexShrink: 0 }}>
                {(seg.pct * 100).toFixed(1)}%
              </span>
              <span className="num" style={{ color: "var(--color-text-3)", flexShrink: 0, fontSize: "11px", minWidth: "52px", textAlign: "right" }}>
                {fmtBrl(seg.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface Props {
  positions: ClientPosition[];
  holders: ClientHolderSummary[];
  totalBrl: number;
}

export function ArchetypeBreakdown({ positions, holders, totalBrl }: Props) {
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);

  const filtered = selectedHolder
    ? positions.filter((p) => p.holder_id === selectedHolder)
    : positions;

  const filteredTotal = selectedHolder
    ? (holders.find((h) => h.id === selectedHolder)?.totalBrl ?? filtered.reduce((s, p) => s + p.market_value_brl, 0))
    : totalBrl;

  const stockPositions = filtered.filter((p) => p.asset_class === "stocks_br");
  const fiiPositions = filtered.filter((p) => p.asset_class === "fiis");
  const isEmpty = stockPositions.length === 0 && fiiPositions.length === 0;

  return (
    <div style={{ padding: "20px" }}>
      {/* Holder filter */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
        <FilterPill active={selectedHolder === null} onClick={() => setSelectedHolder(null)}>
          Todos
        </FilterPill>
        {holders.map((h) => (
          <FilterPill key={h.id} active={selectedHolder === h.id} onClick={() => setSelectedHolder(h.id)}>
            {h.name}
          </FilterPill>
        ))}
      </div>

      {isEmpty ? (
        <div style={{ fontSize: "13px", color: "var(--color-text-3)" }}>
          Nenhum ativo com arquétipo classificado.
        </div>
      ) : (
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
          <DonutChart title="Ações" positions={stockPositions} portfolioTotal={filteredTotal} />
          <DonutChart title="FIIs" positions={fiiPositions} portfolioTotal={filteredTotal} />
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        border: `1px solid ${active ? "var(--color-text)" : "var(--color-line)"}`,
        backgroundColor: active ? "var(--color-text)" : "transparent",
        color: active ? "var(--color-bg)" : "var(--color-text-2)",
        cursor: "pointer",
        transition: "all 0.1s",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}
