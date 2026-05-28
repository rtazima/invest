"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DBAlert } from "@/types/database";
import { AlertCard } from "./AlertCard";
import {
  bulkMarkReadAction,
  bulkDismissAction,
  bulkSnoozeAction,
} from "@/app/(app)/alerts/actions";

interface Props {
  alerts: DBAlert[];
}

export function AlertsList({ alerts }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allIds = alerts.map((a) => a.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedAlerts = alerts.filter((a) => selected.has(a.id));

  function handleBulkRead() {
    startTransition(async () => {
      await bulkMarkReadAction([...selected]);
      clearSelection();
      router.refresh();
    });
  }

  function handleBulkDismiss() {
    startTransition(async () => {
      await bulkDismissAction([...selected]);
      clearSelection();
      router.refresh();
    });
  }

  function handleBulkSnooze() {
    const pairs = selectedAlerts.map((a) => ({
      ticker: a.ticker ?? null,
      alertType: a.generated_by,
    }));
    startTransition(async () => {
      await bulkSnoozeAction(pairs, 30);
      clearSelection();
      router.refresh();
    });
  }

  if (alerts.length === 0) {
    return (
      <div
        style={{
          padding: "48px",
          textAlign: "center",
          color: "var(--color-text-3)",
          fontSize: "13px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
        }}
      >
        Nenhum alerta encontrado
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Barra de seleção */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
          padding: "8px 12px",
          borderRadius: "6px",
          backgroundColor: someSelected ? "var(--color-bg-3)" : "transparent",
          transition: "background-color 0.15s",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            style={{ cursor: "pointer", accentColor: "var(--color-text)" }}
          />
          <span style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>
            {someSelected ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}` : "Selecionar todos"}
          </span>
        </label>

        {someSelected && (
          <>
            <div style={{ width: "1px", height: "14px", backgroundColor: "var(--color-line)" }} />
            <button
              onClick={handleBulkRead}
              disabled={pending}
              style={btnStyle}
            >
              Marcar como lido
            </button>
            <button
              onClick={handleBulkSnooze}
              disabled={pending}
              style={btnStyle}
            >
              Silenciar 30 dias
            </button>
            <button
              onClick={handleBulkDismiss}
              disabled={pending}
              style={{ ...btnStyle, color: "var(--color-crit)" }}
            >
              Dispensar
            </button>
            <button
              onClick={clearSelection}
              disabled={pending}
              style={{ ...btnStyle, marginLeft: "auto" }}
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: pending ? 0.6 : 1, transition: "opacity 0.2s" }}>
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            selected={selected.has(alert.id)}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: "12.5px",
  color: "var(--color-text-2)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: "4px",
  whiteSpace: "nowrap",
};
