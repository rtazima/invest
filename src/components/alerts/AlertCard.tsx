"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DBAlert } from "@/types/database";
import { formatDatetimeBR } from "@/lib/dates";
import { markReadAction, dismissAction, snoozeAction } from "@/app/(app)/alerts/actions";

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

const SNOOZE_OPTIONS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "Sempre", days: null },
];

interface Props {
  alert: DBAlert;
  selected?: boolean;
  onToggle?: (id: string) => void;
}

export function AlertCard({ alert, selected = false, onToggle }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const unread = alert.status === "unread";

  function handleRead() {
    if (!unread) return;
    startTransition(async () => {
      await markReadAction(alert.id);
      router.refresh();
    });
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await dismissAction(alert.id);
      router.refresh();
    });
  }

  function handleSnooze(e: React.MouseEvent, days: number | null) {
    e.stopPropagation();
    setSnoozeOpen(false);
    startTransition(async () => {
      await snoozeAction(alert.ticker ?? null, alert.generated_by, days);
      router.refresh();
    });
  }

  return (
    <div
      className={`sev-${alert.severity === "warning" ? "warn" : alert.severity === "critical" ? "crit" : "info"}`}
      onClick={handleRead}
      style={{
        padding: "16px",
        borderRadius: "8px",
        border: selected ? "1px solid var(--color-text-3)" : "1px solid transparent",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: unread ? "pointer" : "default",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.2s, border-color 0.1s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        {onToggle && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => { e.stopPropagation(); onToggle(alert.id); }}
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: "2px", flexShrink: 0, cursor: "pointer", accentColor: "var(--color-text)" }}
          />
        )}
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

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {/* Snooze */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setSnoozeOpen((v) => !v); }}
              title="Silenciar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-3)",
                fontSize: "13px",
                padding: "0 2px",
                lineHeight: 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 4.5V8l2.5 2.5" />
                <path d="M5.5 2L4 3.5M10.5 2L12 3.5" />
              </svg>
            </button>
            {snoozeOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: 0,
                  backgroundColor: "var(--color-bg-2)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "6px",
                  padding: "4px",
                  zIndex: 10,
                  minWidth: "120px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: "10px", color: "var(--color-text-3)", padding: "4px 8px 6px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Silenciar por
                </div>
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={(e) => handleSnooze(e, opt.days)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      fontSize: "12.5px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text)",
                      borderRadius: "4px",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            title="Dispensar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-3)",
              fontSize: "12px",
              padding: "0 2px",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-text-2)", lineHeight: 1.5 }}>
        {alert.description}
      </p>

      {alert.recommendation && (
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-3)", lineHeight: 1.5 }}>
          → {alert.recommendation}
        </p>
      )}

      {alert.sources && alert.sources.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <a
            href={alert.sources[0]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: "11.5px",
              color: "var(--color-text-3)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              border: "1px solid var(--color-line)",
              borderRadius: "4px",
              padding: "2px 7px",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <polyline points="6,10 10,6" />
              <polyline points="8,6 10,6 10,8" />
            </svg>
            Ver gráfico
          </a>
          {alert.sources.slice(1).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "11px", color: "var(--color-text-3)", textDecoration: "underline" }}
            >
              [{i + 1}]
            </a>
          ))}
        </div>
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
