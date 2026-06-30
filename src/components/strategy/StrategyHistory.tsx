"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revertStrategyAction } from "@/app/(app)/holders/[holderId]/strategy/actions";

export interface VersionSummary {
  id: string;
  created_at: string;
  risk: string;
  allocCount: number;
}

const RISK_LABEL: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Arrojado",
};

export function StrategyHistory({ holderId, versions }: { holderId: string; versions: VersionSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (versions.length <= 1) return null;

  function handleRevert(versionId: string) {
    if (!window.confirm("Reverter a política para esta versão? A versão atual fica guardada no histórico.")) return;
    setError("");
    startTransition(async () => {
      try {
        await revertStrategyAction(holderId, versionId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao reverter.");
      }
    });
  }

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        padding: "20px",
        marginTop: "24px",
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>Histórico da política</h2>
      <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--color-text-3)" }}>
        Cada alteração fica versionada. Dá para reverter para qualquer versão anterior.
      </p>

      {error && <p style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--color-crit)" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {versions.map((v, i) => (
          <div
            key={v.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "8px 0",
              borderTop: i === 0 ? "none" : "1px solid var(--color-line-2)",
            }}
          >
            <div style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>
              {new Date(v.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <span style={{ color: "var(--color-text-3)" }}>
                {" · "}
                {RISK_LABEL[v.risk] ?? v.risk} · {v.allocCount} classe(s)
              </span>
              {i === 0 && <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--color-text-3)" }}>atual</span>}
            </div>
            {i > 0 && (
              <button
                onClick={() => handleRevert(v.id)}
                disabled={pending}
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  borderRadius: "5px",
                  border: "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                  color: "var(--color-text-2)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                Reverter
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
