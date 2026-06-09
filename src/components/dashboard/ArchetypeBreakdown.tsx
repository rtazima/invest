"use client";

import { useState } from "react";
import { ARCHETYPE_LABELS, ARCHETYPE_COLORS } from "@/lib/analysis/types";
import { FII_TYPE_LABELS, FII_TYPE_COLORS } from "@/lib/analysis/fii-types";
import type { ClientPosition, ClientHolderSummary } from "./types";

const ALL_LABELS: Record<string, string> = { ...ARCHETYPE_LABELS, ...FII_TYPE_LABELS };
const ALL_COLORS: Record<string, string> = { ...ARCHETYPE_COLORS, ...FII_TYPE_COLORS };

function fmtBrl(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface ArchetypeEntry {
  archetype: string;
  total: number;
  label: string;
  color: string;
}

function aggregate(positions: ClientPosition[]): ArchetypeEntry[] {
  const map = new Map<string, number>();
  for (const p of positions) {
    const key = p.archetype ?? "sem_tipo";
    map.set(key, (map.get(key) ?? 0) + p.market_value_brl);
  }
  return Array.from(map.entries()).map(([archetype, total]) => ({
    archetype,
    total,
    label: ALL_LABELS[archetype] ?? archetype,
    color: ALL_COLORS[archetype] ?? "var(--color-text-3)",
  }));
}

interface SectionProps {
  title: string;
  entries: ArchetypeEntry[];
  sectionTotal: number;
  portfolioTotal: number;
}

function BreakdownSection({ title, entries, sectionTotal, portfolioTotal }: SectionProps) {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  const max = sorted[0]?.total ?? 0;
  const sectionPct = portfolioTotal > 0 ? (sectionTotal / portfolioTotal) * 100 : 0;

  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
        <span style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-text-3)",
        }}>
          {title}
        </span>
        <span style={{ fontSize: "11px", color: "var(--color-text-3)" }} className="num">
          {fmtBrl(sectionTotal)} · {sectionPct.toFixed(1)}% do portfólio
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {sorted.map((entry) => {
          const pct = sectionTotal > 0 ? entry.total / sectionTotal : 0;
          const barWidth = max > 0 ? (entry.total / max) * 100 : 0;
          return (
            <div key={entry.archetype} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "120px",
                fontSize: "12px",
                color: "var(--color-text-2)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <span style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  backgroundColor: entry.color,
                  flexShrink: 0,
                }} />
                {entry.label}
              </div>
              <div style={{
                flex: 1,
                height: "6px",
                backgroundColor: "var(--color-line)",
                borderRadius: "3px",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${barWidth.toFixed(1)}%`,
                  backgroundColor: entry.color,
                  borderRadius: "3px",
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{
                width: "44px",
                textAlign: "right",
                fontSize: "12px",
                color: "var(--color-text)",
                flexShrink: 0,
              }} className="num">
                {(pct * 100).toFixed(1)}%
              </div>
              <div style={{
                width: "80px",
                textAlign: "right",
                fontSize: "11px",
                color: "var(--color-text-3)",
                flexShrink: 0,
              }} className="num">
                {fmtBrl(entry.total)}
              </div>
            </div>
          );
        })}
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
    ? holders.find((h) => h.id === selectedHolder)?.totalBrl ?? filtered.reduce((s, p) => s + p.market_value_brl, 0)
    : totalBrl;

  const stockPositions = filtered.filter((p) => p.asset_class === "stocks_br");
  const fiiPositions = filtered.filter((p) => p.asset_class === "fiis");

  const stockEntries = aggregate(stockPositions);
  const fiiEntries = aggregate(fiiPositions);
  const stockTotal = stockPositions.reduce((s, p) => s + p.market_value_brl, 0);
  const fiiTotal = fiiPositions.reduce((s, p) => s + p.market_value_brl, 0);

  const isEmpty = stockEntries.length === 0 && fiiEntries.length === 0;

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
        <>
          <BreakdownSection
            title="Ações"
            entries={stockEntries}
            sectionTotal={stockTotal}
            portfolioTotal={filteredTotal}
          />
          <BreakdownSection
            title="FIIs"
            entries={fiiEntries}
            sectionTotal={fiiTotal}
            portfolioTotal={filteredTotal}
          />
        </>
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
