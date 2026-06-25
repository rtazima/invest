"use client";

import { useState, type CSSProperties } from "react";
import type { ScenarioView, ScenarioCaseView, Freshness } from "@/lib/scenario/data";
import type { HouseView } from "@/lib/research/data";

const CASE_META = [
  { key: "base", label: "Base", color: "var(--color-info)" },
  { key: "bull", label: "Otimista", color: "var(--color-gain)" },
  { key: "bear", label: "Pessimista", color: "var(--color-loss)" },
] as const;

const CLASS_LABELS: Record<string, string> = {
  fixed_income_pre: "Pré-fixado",
  fixed_income_ipca: "IPCA+",
  fixed_income_pos: "Pós (CDI/Selic)",
  fiis: "FIIs",
  stocks_br: "Bolsa BR",
  stocks_intl: "Bolsa internacional",
  usd: "Dólar",
};

const muted: CSSProperties = { fontSize: "13px", color: "var(--color-text-3)" };

function FreshnessBadge({ freshness, ageDays }: { freshness: Freshness; ageDays: number }) {
  const map = {
    current: { text: "atualizado", fg: "var(--color-gain)", bg: "var(--color-gain-subtle)" },
    stale: { text: `desatualizado · ${ageDays}d`, fg: "var(--color-warn)", bg: "var(--color-warning-subtle)" },
    unavailable: { text: "indisponível", fg: "var(--color-crit)", bg: "var(--color-critical-subtle)" },
  }[freshness];
  return (
    <span
      style={{
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 500,
        color: map.fg,
        backgroundColor: map.bg,
      }}
    >
      {map.text}
    </span>
  );
}

function ProbabilityBar({ s }: { s: ScenarioView }) {
  const cases = [
    { color: CASE_META[0].color, p: s.base.probability },
    { color: CASE_META[1].color, p: s.bull.probability },
    { color: CASE_META[2].color, p: s.bear.probability },
  ];
  const total = cases.reduce((sum, c) => sum + c.p, 0) || 100;
  let x = 0;
  return (
    <svg viewBox="0 0 100 6" style={{ width: "100%", height: "10px", display: "block" }} preserveAspectRatio="none">
      {cases.map((c, i) => {
        const w = (c.p / total) * 100;
        const rect = <rect key={i} x={x} y={0} width={w} height={6} fill={c.color} />;
        x += w;
        return rect;
      })}
    </svg>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontWeight: 500, color: "var(--color-text-2)" }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: "16px", listStyle: "disc", color: "var(--color-text-3)" }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function CaseBlock({ c, meta }: { c: ScenarioCaseView; meta: (typeof CASE_META)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: "6px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg)",
        padding: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, color: "var(--color-text)" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: meta.color }} />
          {meta.label}
        </span>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "var(--color-text)" }}>
          {Math.round(c.probability)}%
        </span>
      </div>
      <p style={{ ...muted, margin: "8px 0 0" }}>{c.thesis}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-text-3)", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}
      >
        {open ? "menos" : "premissas, gatilhos e implicações"}
      </button>
      {open && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
          <DetailList title="Premissas" items={c.premises} />
          <DetailList title="Gatilhos" items={c.triggers} />
          <DetailList title="Evidências contrárias" items={c.counter_evidence} />
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 500, color: "var(--color-text-2)" }}>Por classe</p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
              {Object.entries(c.by_class).map(([k, v]) => (
                <li key={k} style={{ color: "var(--color-text-3)" }}>
                  <span style={{ color: "var(--color-text-2)" }}>{CLASS_LABELS[k] ?? k}:</span> {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScenarioCard({
  scenario,
  houseViews,
}: {
  scenario: ScenarioView | null;
  houseViews?: HouseView[];
}) {
  if (!scenario) return null;

  return (
    <section
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        padding: "16px",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>Cenário de mercado</h2>
          <FreshnessBadge freshness={scenario.freshness} ageDays={scenario.ageDays} />
        </div>
        <span style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
          v{scenario.version} · dados de {new Date(scenario.dataAsOf).toLocaleDateString("pt-BR")}
        </span>
      </header>

      {scenario.freshness === "unavailable" ? (
        <p style={{ ...muted, marginTop: "12px" }}>
          Cenário indisponível: os dados estão defasados há {scenario.ageDays} dias ou as últimas execuções
          falharam. Não exibido como utilizável até a próxima atualização.
        </p>
      ) : (
        <>
          <div style={{ marginTop: "12px" }}>
            <ProbabilityBar s={scenario} />
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "13px", color: "var(--color-text)" }}>{scenario.summary}</p>
          {!scenario.usAvailable && (
            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-warn)" }}>
              Bloco de EUA indisponível nesta rodada. Leitura internacional com cautela.
            </p>
          )}
          <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {CASE_META.map((meta) => (
              <CaseBlock key={meta.key} c={scenario[meta.key]} meta={meta} />
            ))}
          </div>
        </>
      )}

      {houseViews && houseViews.length > 0 && (
        <div style={{ marginTop: "16px", borderTop: "1px solid var(--color-line-2)", paddingTop: "12px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-2)" }}>
            Visão das casas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {houseViews.map((h) => (
              <div key={h.id}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--color-text)",
                      backgroundColor: "var(--color-bg-3)",
                      borderRadius: "3px",
                      padding: "1px 6px",
                    }}
                  >
                    {h.house}
                  </span>
                  {h.report_date && (
                    <span style={{ fontSize: "11px", color: "var(--color-text-3)" }}>
                      {new Date(h.report_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-2)" }}>{h.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
