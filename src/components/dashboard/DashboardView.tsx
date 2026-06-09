"use client";

import { useState, useMemo } from "react";
import { PortfolioHeroCard } from "./PortfolioHeroCard";
import { HolderCard } from "./HolderCard";
import { useLivePrices } from "@/lib/prices/live-context";
import { PositionsTable } from "./PositionsTable";
import { AllocationDonut } from "./AllocationDonut";
import { TabByHolder } from "./TabByHolder";
import { TabByHolderInstitution } from "./TabByHolderInstitution";
import { TabByInstitution } from "./TabByInstitution";
import { TabByClass } from "./TabByClass";
import { TabByIndexer } from "./TabByIndexer";
import { ArchetypeBreakdown } from "./ArchetypeBreakdown";
import type { ClientPortfolioSummary, ClientPosition } from "./types";
import type { InstitutionSyncStatus } from "@/lib/data/sync";
import Link from "next/link";

const TABS = [
  { id: "global", label: "Global", shortcut: "G" },
  { id: "titular", label: "Por Titular", shortcut: "T" },
  { id: "titular_inst", label: "Titular × Inst.", shortcut: "X" },
  { id: "instituicao", label: "Por Instituição", shortcut: "I" },
  { id: "indexador", label: "Por Indexador", shortcut: "N" },
  { id: "classe", label: "Por Classe", shortcut: "C" },
  { id: "arquetipo", label: "Arquétipos", shortcut: "A" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  summary: ClientPortfolioSummary;
  positions: ClientPosition[];
  syncStatuses: InstitutionSyncStatus[];
  totalUsd?: number;
}

export function DashboardView({ summary, positions, syncStatuses, totalUsd }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("global");
  const { live, liveFxRate } = useLivePrices();
  const hasData = summary.totalBrl > 0;

  // Ajuste intraday: parte BRL do DB + parte USD × cotação ao vivo (Yahoo Finance)
  // live.fxRate = taxa gravada no DB (Open Exchange Rates, ~1x/h)
  // liveFxRate  = cotação Yahoo Finance (intraday, oscila durante o pregão)
  // Diferença entre os dois gera o ajuste em tempo real
  const liveAdjustedTotal =
    live != null && liveFxRate != null && live.fxRate != null && totalUsd != null && totalUsd > 0
      ? live.totalBrl + totalUsd * (liveFxRate - live.fxRate)
      : live?.totalBrl;

  // Posições com market_value_brl recalculado pelo câmbio ao vivo para posições USD
  const livePositions = useMemo(() => {
    if (!liveFxRate) return positions;
    return positions.map((p) =>
      p.currency === "USD"
        ? { ...p, market_value_brl: p.market_value * liveFxRate }
        : p,
    );
  }, [positions, liveFxRate]);

  return (
    <div style={{ display: "flex", gap: "0", position: "relative" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Hero section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <PortfolioHeroCard
                summary={summary}
                liveTotal={liveAdjustedTotal}
                totalUsd={totalUsd}
                liveFxRate={liveFxRate}
              />

              {/* Cards de titular */}
              <div
                style={{
                  gridColumn: "span 5",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {summary.byHolder.map((h) => (
                  <HolderCard
                    key={h.id}
                    holder={h}
                    liveTotal={live?.byHolder.find((lh) => lh.id === h.id)?.totalBrl}
                  />
                ))}
              </div>
            </div>

            {/* Tabs section */}
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid var(--color-line-2)",
                backgroundColor: "var(--color-bg-2)",
                overflow: "hidden",
              }}
            >
              {/* Tablist */}
              <div
                style={{
                  borderBottom: "1px solid var(--color-line-2)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-selected={activeTab === tab.id}
                    role="tab"
                    style={{
                      position: "relative",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: activeTab === tab.id ? "var(--color-text)" : "var(--color-text-3)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "color 0.1s",
                    }}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "-1px",
                          left: 0,
                          right: 0,
                          height: "1.5px",
                          backgroundColor: "var(--color-text)",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div>
                {activeTab === "global" && (
                  <div style={{ padding: "20px" }}>
                    <AllocationDonut byAssetClass={summary.byAssetClass} totalBrl={summary.totalBrl} />
                    <div style={{ marginTop: "24px" }}>
                      <PositionsTable positions={livePositions} totalBrl={summary.totalBrl} />
                    </div>
                  </div>
                )}
                {activeTab === "titular" && <TabByHolder summary={summary} />}
                {activeTab === "titular_inst" && <TabByHolderInstitution summary={summary} />}
                {activeTab === "instituicao" && (
                  <TabByInstitution summary={summary} syncStatuses={syncStatuses} />
                )}
                {activeTab === "indexador" && <TabByIndexer positions={livePositions} summary={summary} />}
                {activeTab === "classe" && <TabByClass summary={summary} />}
                {activeTab === "arquetipo" && (
                  <ArchetypeBreakdown
                    positions={livePositions}
                    holders={summary.byHolder}
                    totalBrl={liveAdjustedTotal ?? summary.totalBrl}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        gap: "16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "var(--color-bg-3)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
          <polyline points="3,17 8,12 13,14 21,6" />
          <path d="M21 6v6M21 6h-6" />
        </svg>
      </div>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 600, color: "var(--color-text)" }}>
          Nenhum dado importado
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-3)" }}>
          Importe seu portfólio para visualizar o dashboard consolidado.
        </p>
      </div>
      <Link
        href="/import"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 16px",
          borderRadius: "6px",
          backgroundColor: "var(--color-bg-3)",
          border: "1px solid var(--color-line)",
          color: "var(--color-text)",
          textDecoration: "none",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 2v8M4 7l3 4 3-4" />
          <path d="M2 12h10" />
        </svg>
        Importar portfólio
      </Link>
    </div>
  );
}
