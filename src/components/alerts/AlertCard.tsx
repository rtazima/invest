"use client";

import { useTransition } from "react";
import type { DBAlert } from "@/types/database";
import { formatDatetimeBR } from "@/lib/dates";
import { markReadAction, dismissAction } from "@/app/(app)/alerts/actions";

const SEV_COLORS: Record<string, string> = {
  info: "var(--color-info)",
  warning: "var(--color-warn)",
  critical: "var(--color-crit)",
};

const SEV_LABELS: Record<string, string> = {
  info: "INFO",
  warning: "WARNING",
  critical: "CRITICAL",
};

interface Props {
  alert: DBAlert;
}

export function AlertCard({ alert }: Props) {
  const [pending, startTransition] = useTransition();
  const sevClass = alert.severity === "warning" ? "sev-warn" : alert.severity === "critical" ? "sev-crit" : "sev-info";
  const unread = alert.status === "unread";

  function handleRead() {
    if (!unread) return;
    startTransition(() => markReadAction(alert.id));
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(() => dismissAction(alert.id));
  }

  return (
    <div
      className={sevClass}
      onClick={handleRead}
      style={{
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid transparent",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: unread ? "pointer" : "default",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          {unread && (
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: SEV_COLORS[alert.severity],
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: "13px", fontWeight: unread ? 600 : 500, lineHeight: 1.4 }}>
            {alert.title}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-3)",
            fontSize: "12px",
            padding: "0",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-text-2)", lineHeight: 1.5 }}>
        {alert.description}
      </p>

      {alert.recommendation && (
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-3)", lineHeight: 1.5 }}>
          → {alert.recommendation}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: SEV_COLORS[alert.severity],
          }}
        >
          {SEV_LABELS[alert.severity]}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {alert.ticker && (
            <span className="num pill">{alert.ticker}</span>
          )}
          <span className="num" style={{ fontSize: "11px", color: "var(--color-text-3)" }}>
            {formatDatetimeBR(alert.generated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
