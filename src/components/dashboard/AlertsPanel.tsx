"use client";

import { useState } from "react";
import type { ClientAlert } from "./types";
import { formatDatetimeBR } from "@/lib/dates";

const SEV_LABELS: Record<string, string> = {
  info: "INFO",
  warning: "WARN",
  critical: "CRIT",
};

interface Props {
  alerts: ClientAlert[];
}

export function AlertsPanel({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id)).slice(0, 20);
  const unread = visible.filter((a) => a.status === "unread").length;

  return (
    <aside
      style={{
        position: "fixed",
        right: 0,
        top: "48px",
        bottom: 0,
        width: "256px",
        borderLeft: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg)",
        overflowY: "auto",
        zIndex: 5,
      }}
    >
      {/* Header */}
      <div
        className="hairline"
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          backgroundColor: "var(--color-bg)",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 500 }}>Alertas</span>
        {unread > 0 && (
          <span
            className="num"
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "3px",
              fontSize: "10px",
              backgroundColor: "var(--color-crit)",
              color: "white",
              display: "grid",
              placeItems: "center",
            }}
          >
            {unread}
          </span>
        )}
      </div>

      {/* Alert cards */}
      <div>
        {visible.length === 0 && (
          <p style={{ padding: "16px", fontSize: "12px", color: "var(--color-text-3)", textAlign: "center" }}>
            Nenhum alerta
          </p>
        )}
        {visible.map((alert) => (
          <div
            key={alert.id}
            className={`sev-${alert.severity === "warning" ? "warn" : alert.severity === "critical" ? "crit" : "info"}`}
            style={{
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              borderLeft: "2px solid transparent",
              borderBottom: "1px solid var(--color-line-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "4px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 500, lineHeight: 1.3 }}>{alert.title}</span>
              <button
                onClick={() => setDismissed((s) => new Set([...s, alert.id]))}
                style={{
                  fontSize: "10px",
                  color: "var(--color-text-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 0 0 4px",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                color: "var(--color-text-2)",
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {alert.description}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color:
                    alert.severity === "critical"
                      ? "var(--color-crit)"
                      : alert.severity === "warning"
                        ? "var(--color-warn)"
                        : "var(--color-info)",
                }}
              >
                {SEV_LABELS[alert.severity]}
              </span>
              <span className="num" style={{ fontSize: "10.5px", color: "var(--color-text-3)" }}>
                {formatDatetimeBR(alert.generated_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
