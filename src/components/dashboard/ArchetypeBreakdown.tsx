"use client";

import { useState, useRef, useCallback } from "react";
import { ARCHETYPE_LABELS, ARCHETYPE_COLORS, TECH_SUBSEGMENT_LABELS } from "@/lib/analysis/types";
import { FII_TYPE_LABELS, FII_TYPE_COLORS } from "@/lib/analysis/fii-types";
import type { ClientPosition, ClientHolderSummary } from "./types";

const ALL_LABELS: Record<string, string> = { ...ARCHETYPE_LABELS, ...FII_TYPE_LABELS };
const ALL_COLORS: Record<string, string> = { ...ARCHETYPE_COLORS, ...FII_TYPE_COLORS };

const CIRCUMFERENCE = 2 * Math.PI * 54;
const PANEL_W = 360;
const PANEL_H = 280;

function fmtBrl(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Segment {
  key: string;
  total: number;
  pct: number;
  label: string;
  color: string;
  arc: number;
  dashOffset: number;
}

function buildSegments(
  map: Map<string, number>,
  sectionTotal: number,
  colorFn: (key: string, i: number) => string,
): Segment[] {
  let offset = 0;
  return [...map.entries()]
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key, total], i) => {
      const pct = sectionTotal > 0 ? total / sectionTotal : 0;
      const arc = pct * CIRCUMFERENCE;
      const dashOffset = CIRCUMFERENCE - offset;
      offset += arc;
      return {
        key, total, pct,
        label: ALL_LABELS[key] ?? (TECH_SUBSEGMENT_LABELS as Record<string, string>)[key] ?? key,
        color: colorFn(key, i),
        arc, dashOffset,
      };
    });
}

const SUBSEG_COLORS = [
  "oklch(0.65 0.15 195)", "oklch(0.68 0.14 210)", "oklch(0.62 0.16 180)",
  "oklch(0.70 0.13 220)", "oklch(0.60 0.17 170)", "oklch(0.72 0.12 230)",
  "oklch(0.58 0.14 200)",
];

// ─── Painel flutuante (position: fixed, não afeta layout) ────────────────────

interface FloatingPanelProps {
  seg: Segment;
  positions: ClientPosition[];
  x: number;
  y: number;
  onEnter: () => void;
  onLeave: () => void;
}

function FloatingPanel({ seg, positions, x, y, onEnter, onLeave }: FloatingPanelProps) {
  const left = Math.min(x + 16, window.innerWidth  - PANEL_W - 16);
  const top  = Math.min(y + 16, window.innerHeight - PANEL_H - 16);
  const sorted = [...positions].sort((a, b) => b.market_value_brl - a.market_value_brl);

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: "fixed",
        left,
        top,
        width: PANEL_W,
        zIndex: 50,
        borderRadius: "8px",
        border: `1px solid color-mix(in oklch, ${seg.color} 35%, var(--color-line))`,
        backgroundColor: "var(--color-bg-2)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: `1px solid color-mix(in oklch, ${seg.color} 20%, var(--color-line))`,
        backgroundColor: `color-mix(in oklch, ${seg.color} 8%, var(--color-bg-2))`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: seg.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>{seg.label}</span>
        </div>
        <span className="num" style={{ fontSize: "11px", color: "var(--color-text-3)" }}>
          {fmtBrl(seg.total)} · {(seg.pct * 100).toFixed(1)}%
        </span>
      </div>
      {/* Rows */}
      <div style={{ maxHeight: `${PANEL_H - 40}px`, overflowY: "auto" }}>
        {sorted.map((p) => (
          <div
            key={p.id}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 1fr auto",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderBottom: "1px solid var(--color-line-2)",
              fontSize: "12px",
            }}
          >
            <span className="num" style={{ fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.ticker ?? "—"}
            </span>
            <span style={{ color: "var(--color-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name ?? "—"}
            </span>
            <span style={{ color: "var(--color-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.holder_name}
            </span>
            <span className="num" style={{ color: "var(--color-text)", textAlign: "right", flexShrink: 0 }}>
              {fmtBrl(p.market_value_brl)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────

interface DonutProps {
  title: string;
  segments: Segment[];
  positionsByKey: Map<string, ClientPosition[]>;
  sectionTotal: number;
  portfolioTotal: number;
  centerLabel?: string;
}

function DonutChart({ title, segments, positionsByKey, sectionTotal, portfolioTotal, centerLabel }: DonutProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = useCallback(() => {
    clearTimer.current = setTimeout(() => setHovered(null), 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  const handleEnter = useCallback((key: string, e: React.MouseEvent) => {
    cancelClose();
    setHovered(key);
    setAnchorPos({ x: e.clientX, y: e.clientY });
  }, [cancelClose]);

  if (segments.length === 0) return null;

  const sectionPct = portfolioTotal > 0 ? (sectionTotal / portfolioTotal) * 100 : 0;
  const hoveredSeg = segments.find((s) => s.key === hovered);
  const center = centerLabel ?? `${segments.length} tipo${segments.length !== 1 ? "s" : ""}`;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Título */}
      <div style={{ marginBottom: "12px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-3)" }}>
          {title}
        </span>
        <span style={{ fontSize: "11px", color: "var(--color-text-3)", marginLeft: "8px" }} className="num">
          {fmtBrl(sectionTotal)} · {sectionPct.toFixed(1)}% do portfólio
        </span>
      </div>

      {/* Donut + Legenda */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Donut SVG */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg
            viewBox="-80 -80 160 160"
            width="130"
            height="130"
            onMouseLeave={scheduleClose}
          >
            <circle r="54" fill="none" stroke="var(--color-line)" strokeWidth="18" />
            {segments.map((seg) => (
              <circle
                key={seg.key}
                r="54"
                fill="none"
                stroke={seg.color}
                strokeWidth={hovered === seg.key ? 26 : 18}
                strokeDasharray={`${seg.arc.toFixed(2)} ${(CIRCUMFERENCE - seg.arc).toFixed(2)}`}
                strokeDashoffset={seg.dashOffset.toFixed(2)}
                transform="rotate(-90)"
                style={{ transition: "stroke-width 0.15s ease", cursor: "pointer" }}
                onMouseEnter={(e) => handleEnter(seg.key, e)}
              />
            ))}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
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
              <span style={{ fontSize: "11px", color: "var(--color-text-3)" }} className="num">{center}</span>
            )}
          </div>
        </div>

        {/* Legenda */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
          {segments.map((seg) => (
            <li
              key={seg.key}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", cursor: "default" }}
              onMouseEnter={(e) => handleEnter(seg.key, e)}
              onMouseLeave={scheduleClose}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: seg.color, flexShrink: 0 }} />
              <span style={{ color: hovered === seg.key ? "var(--color-text)" : "var(--color-text-2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* Painel flutuante — position: fixed, não afeta layout da página */}
      {hoveredSeg && anchorPos && positionsByKey.has(hoveredSeg.key) && (
        <FloatingPanel
          seg={hoveredSeg}
          positions={positionsByKey.get(hoveredSeg.key)!}
          x={anchorPos.x}
          y={anchorPos.y}
          onEnter={cancelClose}
          onLeave={scheduleClose}
        />
      )}
    </div>
  );
}

// ─── Seção (uma classe de ativo) ─────────────────────────────────────────────

interface SectionProps {
  title: string;
  positions: ClientPosition[];
  portfolioTotal: number;
}

function Section({ title, positions, portfolioTotal }: SectionProps) {
  if (positions.length === 0) return null;

  const byArchetype = new Map<string, number>();
  const positionsByArchetype = new Map<string, ClientPosition[]>();
  const bySubsegment = new Map<string, number>();
  const positionsBySubsegment = new Map<string, ClientPosition[]>();
  let total = 0;

  for (const p of positions) {
    const key = p.archetype ?? "sem_tipo";
    byArchetype.set(key, (byArchetype.get(key) ?? 0) + p.market_value_brl);
    if (!positionsByArchetype.has(key)) positionsByArchetype.set(key, []);
    positionsByArchetype.get(key)!.push(p);
    total += p.market_value_brl;

    if (key === "tech" && p.subsegment) {
      bySubsegment.set(p.subsegment, (bySubsegment.get(p.subsegment) ?? 0) + p.market_value_brl);
      if (!positionsBySubsegment.has(p.subsegment)) positionsBySubsegment.set(p.subsegment, []);
      positionsBySubsegment.get(p.subsegment)!.push(p);
    }
  }

  const techTotal = byArchetype.get("tech") ?? 0;
  const archetypeSegments = buildSegments(byArchetype, total, (key) => ALL_COLORS[key] ?? "oklch(0.55 0.04 240)");
  const subSegments = bySubsegment.size > 0
    ? buildSegments(bySubsegment, techTotal, (_key, i) => SUBSEG_COLORS[i % SUBSEG_COLORS.length] ?? "oklch(0.55 0.04 240)")
    : [];

  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        <DonutChart
          title={title}
          segments={archetypeSegments}
          positionsByKey={positionsByArchetype}
          sectionTotal={total}
          portfolioTotal={portfolioTotal}
        />
        {subSegments.length > 0 && (
          <DonutChart
            title="Tech — subsegmentos"
            segments={subSegments}
            positionsByKey={positionsBySubsegment}
            sectionTotal={techTotal}
            portfolioTotal={portfolioTotal}
            centerLabel="tech"
          />
        )}
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

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

  const byClass = (cls: string | string[]) => {
    const set = new Set(Array.isArray(cls) ? cls : [cls]);
    return filtered.filter((p) => set.has(p.asset_class));
  };

  const sections: Array<{ title: string; positions: ClientPosition[] }> = [
    { title: "Ações BR",      positions: byClass("stocks_br") },
    { title: "FIIs",          positions: byClass("fiis") },
    { title: "Internacional", positions: byClass("stocks_intl") },
    { title: "ETFs",          positions: byClass(["etf_br", "etf_intl"]) },
  ].filter((s) => s.positions.length > 0);

  return (
    <div style={{ padding: "20px" }}>
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

      {sections.length === 0 ? (
        <div style={{ fontSize: "13px", color: "var(--color-text-3)" }}>
          Nenhum ativo com arquétipo classificado.
        </div>
      ) : (
        sections.map((s) => (
          <Section key={s.title} title={s.title} positions={s.positions} portfolioTotal={filteredTotal} />
        ))
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
