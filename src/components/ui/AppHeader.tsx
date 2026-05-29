"use client";

import { usePathname } from "next/navigation";
import type { InstitutionSyncStatus } from "@/lib/data/sync";
import { formatDatetimeBR } from "@/lib/dates";
import { usePrivacy } from "@/components/layout/PrivacyShell";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/alerts": "Alertas",
  "/holders": "Estratégia",
  "/import": "Importar",
  "/familia": "Família",
  "/settings": "Configurações",
};

interface Props {
  familyName: string;
  syncStatuses: InstitutionSyncStatus[];
}

export function AppHeader({ familyName, syncStatuses }: Props) {
  const pathname = usePathname();
  const { hidden, toggle } = usePrivacy();
  const pageLabel = Object.entries(BREADCRUMBS).find(([k]) => pathname.startsWith(k))?.[1] ?? "—";

  const lastSync = syncStatuses
    .flatMap((s) => (s.completedAt ? [new Date(s.completedAt)] : []))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const lastSyncLabel = lastSync
    ? formatDatetimeBR(lastSync).split(" ")[1]
    : null;

  return (
    <header
      className="hairline"
      style={{
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "color-mix(in oklch, var(--color-bg) 95%, transparent)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
        <span style={{ color: "var(--color-text-3)" }}>{familyName}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-text-3)" }}>
          <path d="M4 2l4 4-4 4" />
        </svg>
        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{pageLabel}</span>
      </div>

      {/* Sync status + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", color: "var(--color-text-2)" }}>
          {syncStatuses.map((s) => (
            <span key={s.institution} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                className="dot"
                style={{
                  backgroundColor: s.status === "ok" ? "var(--color-gain)" : s.status === "warn" ? "var(--color-warn)" : "var(--color-text-3)",
                }}
              />
              {s.institution.toUpperCase()}
            </span>
          ))}
          {lastSyncLabel && (
            <span className="num" style={{ color: "var(--color-text-3)" }}>
              · atualizado {lastSyncLabel}
            </span>
          )}
        </div>

        <button
          onClick={toggle}
          title={hidden ? "Mostrar valores" : "Ocultar valores"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 6px",
            borderRadius: "6px",
            backgroundColor: hidden ? "var(--color-bg-3)" : "transparent",
            color: hidden ? "var(--color-text)" : "var(--color-text-3)",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.1s, color 0.1s",
          }}
        >
          {hidden ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l12 12" />
              <path d="M6.5 6.6A2 2 0 0 0 8 10a2 2 0 0 0 1.4-.6" />
              <path d="M3.4 3.5A8 8 0 0 0 1 8s2.4 5 7 5a7.2 7.2 0 0 0 4.6-1.6" />
              <path d="M8.5 3.1A7.7 7.7 0 0 1 15 8a8.3 8.3 0 0 1-.8 1.6" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8s2.4-5 7-5 7 5 7 5-2.4 5-7 5-7-5-7-5Z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          )}
        </button>

        <button
          title="Sincronizar"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "6px",
            backgroundColor: "transparent",
            color: "var(--color-text-2)",
            border: "none",
            cursor: "pointer",
            fontSize: "12.5px",
            fontWeight: 500,
            transition: "background-color 0.1s, color 0.1s",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 6.5A4.5 4.5 0 0 1 2 6.5M2 6.5V3M2 3h3" />
            <path d="M2 6.5A4.5 4.5 0 0 1 11 6.5M11 6.5V10M11 10H8" />
          </svg>
        </button>
      </div>
    </header>
  );
}
