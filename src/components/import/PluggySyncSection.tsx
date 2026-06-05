"use client";

import { useState, useTransition } from "react";
import { syncPluggy, type PluggyInstitution } from "@/app/(app)/import/actions";
import type { DBHolder } from "@/types/database";

interface PluggyConnection {
  institution: string;
  label: string;
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
}

interface Props {
  holders: DBHolder[];
  connections: PluggyConnection[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function ConnectionRow({
  conn,
  holders,
}: {
  conn: PluggyConnection;
  holders: DBHolder[];
}) {
  const [holderId, setHolderId] = useState(holders[0]?.id ?? "");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const res = await syncPluggy(holderId, conn.institution as PluggyInstitution);
      if (res.success) {
        const note = res.skipped
          ? ` (${res.skipped} Tesouro Direto via CSV)`
          : "";
        setResult({ ok: true, msg: `${res.rowCount} posições sincronizadas${note}.` });
      } else {
        setResult({ ok: false, msg: res.errorMessage ?? "Erro desconhecido." });
      }
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        borderRadius: "6px",
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        opacity: conn.connected ? 1 : 0.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: conn.connected ? "var(--color-gain)" : "var(--color-text-faint)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
            {conn.label}
          </span>
          {!conn.connected && (
            <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>Em breve</span>
          )}
        </div>

        {conn.lastSyncAt && (
          <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>
            última sync {timeAgo(conn.lastSyncAt)}
            {conn.lastSyncCount != null && ` · ${conn.lastSyncCount} posições`}
          </span>
        )}
      </div>

      {conn.connected && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={holderId}
            onChange={(e) => { setHolderId(e.target.value); setResult(null); }}
            disabled={pending}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              backgroundColor: "var(--color-bg-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
          >
            {holders.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          <button
            onClick={handleSync}
            disabled={pending || !holderId}
            style={{
              padding: "4px 14px",
              fontSize: "12px",
              fontWeight: 500,
              backgroundColor: pending ? "var(--color-bg-2)" : "var(--color-brand)",
              color: pending ? "var(--color-text-muted)" : "white",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Sincronizando..." : "Sincronizar agora"}
          </button>

          {result && (
            <span
              style={{
                fontSize: "12px",
                color: result.ok ? "var(--color-gain)" : "var(--color-critical)",
              }}
            >
              {result.ok ? "✓" : "✗"} {result.msg}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PluggySyncSection({ holders, connections }: Props) {
  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-2)",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
          Sincronizar via Pluggy
        </h2>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
          Substitui todos os dados importados da corretora pelos dados ao vivo. Tesouro Direto não está disponível via Pluggy — importe o extrato CSV após sincronizar.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {connections.map((conn) => (
          <ConnectionRow key={conn.institution} conn={conn} holders={holders} />
        ))}
      </div>
    </div>
  );
}
