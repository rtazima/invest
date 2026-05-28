"use client";

import { useState, useTransition } from "react";
import type { DBHolder } from "@/types/database";
import type { StrategyWithAllocations } from "@/lib/data/strategies";
import { RiskProfileBadge } from "./RiskProfileBadge";
import { AllocationEditor } from "./AllocationEditor";
import { saveStrategyAction, saveAllocationsAction, suggestAllocationsAction } from "@/app/(app)/holders/[holderId]/strategy/actions";

const PROFILES = [
  { value: "conservative", label: "Conservador" },
  { value: "moderate", label: "Moderado" },
  { value: "aggressive", label: "Arrojado" },
] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid var(--color-line)",
  backgroundColor: "var(--color-bg-2)",
  color: "var(--color-text)",
  fontSize: "13px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--color-text-2)",
  marginBottom: "6px",
};

interface Props {
  holder: DBHolder;
  strategy: StrategyWithAllocations | null;
}

export function StrategyPanel({ holder, strategy }: Props) {
  const [editing, setEditing] = useState(!strategy);
  const [pending, startTransition] = useTransition();

  const [profile, setProfile] = useState<"conservative" | "moderate" | "aggressive">(
    (strategy?.risk_profile as "conservative" | "moderate" | "aggressive") ?? "aggressive",
  );
  const [horizon, setHorizon] = useState(strategy?.investment_horizon_years?.toString() ?? "");
  const [goalDesc, setGoalDesc] = useState(strategy?.goal_description ?? "");
  const [goalIncome, setGoalIncome] = useState(
    strategy?.goal_monthly_income?.toString() ?? "",
  );
  const [goalAge, setGoalAge] = useState(strategy?.goal_target_age?.toString() ?? "");
  const [liqMin, setLiqMin] = useState(
    ((strategy?.liquidity_min_pct ?? 0.1) * 100).toFixed(0),
  );
  const [threshold, setThreshold] = useState(
    ((strategy?.deviation_threshold_pct ?? 0.05) * 100).toFixed(0),
  );
  const [notes, setNotes] = useState(strategy?.notes ?? "");

  function handleSaveProfile() {
    startTransition(async () => {
      await saveStrategyAction(holder.id, {
        risk_profile: profile,
        investment_horizon_years: horizon ? parseInt(horizon) : null,
        goal_description: goalDesc || null,
        goal_monthly_income: goalIncome ? parseFloat(goalIncome) : null,
        goal_target_age: goalAge ? parseInt(goalAge) : null,
        liquidity_min_pct: parseFloat(liqMin) / 100,
        deviation_threshold_pct: parseFloat(threshold) / 100,
        notes: notes || null,
      });
      setEditing(false);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Perfil */}
      <div
        style={{
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Perfil e objetivo</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                fontSize: "12px",
                color: "var(--color-text-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Editar
            </button>
          )}
        </div>

        {!editing && strategy ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <RiskProfileBadge profile={strategy.risk_profile} />
              {strategy.investment_horizon_years && (
                <span style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>
                  {strategy.investment_horizon_years} anos
                </span>
              )}
            </div>
            {strategy.goal_description && (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-2)" }}>
                {strategy.goal_description}
              </p>
            )}
            <div style={{ display: "flex", gap: "24px", fontSize: "12.5px" }}>
              <span>
                <span style={{ color: "var(--color-text-3)" }}>Liquidez mín.: </span>
                <span className="num">{(strategy.liquidity_min_pct * 100).toFixed(0)}%</span>
              </span>
              <span>
                <span style={{ color: "var(--color-text-3)" }}>Threshold: </span>
                <span className="num">{(strategy.deviation_threshold_pct * 100).toFixed(0)}%</span>
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Perfil de risco</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {PROFILES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setProfile(p.value)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: `1px solid ${profile === p.value ? "var(--color-text)" : "var(--color-line)"}`,
                      backgroundColor: profile === p.value ? "var(--color-bg-3)" : "transparent",
                      color: profile === p.value ? "var(--color-text)" : "var(--color-text-3)",
                      fontSize: "12.5px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Horizonte (anos)</label>
                <input
                  type="number"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  placeholder="Ex: 10"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Meta: renda passiva (R$/mês)</label>
                <input
                  type="number"
                  value={goalIncome}
                  onChange={(e) => setGoalIncome(e.target.value)}
                  placeholder="Ex: 12000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Objetivo: idade-alvo</label>
                <input
                  type="number"
                  value={goalAge}
                  onChange={(e) => setGoalAge(e.target.value)}
                  placeholder="Ex: 18"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Liquidez mínima (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={liqMin}
                  onChange={(e) => setLiqMin(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Threshold de desvio (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Objetivo (descrição)</label>
              <input
                type="text"
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                placeholder="Ex: Renda passiva para complementar gastos"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" as const }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {strategy && (
                <button
                  onClick={() => setEditing(false)}
                  style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={pending}
                style={{
                  padding: "8px 20px",
                  borderRadius: "6px",
                  backgroundColor: "var(--color-text)",
                  border: "none",
                  color: "var(--color-bg)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.7 : 1,
                }}
              >
                {pending ? "Salvando..." : "Salvar perfil"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alocações */}
      {strategy && (
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid var(--color-line-2)",
            backgroundColor: "var(--color-bg-2)",
            padding: "20px",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Alocação-alvo</h2>
          <AllocationEditor
            initial={strategy.allocations}
            onSave={async (rows) => {
              await saveAllocationsAction(holder.id, rows);
            }}
            onSuggest={() =>
              suggestAllocationsAction(holder.id, {
                risk_profile: profile,
                investment_horizon_years: horizon ? parseInt(horizon) : null,
                goal_description: goalDesc || null,
                goal_monthly_income: goalIncome ? parseFloat(goalIncome) : null,
                goal_target_age: goalAge ? parseInt(goalAge) : null,
                liquidity_min_pct: parseFloat(liqMin) / 100,
                notes: notes || null,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
