"use client";

import { useState } from "react";
import type { DBImportBatch, DBHolder } from "@/types/database";
import { deleteImportBatch } from "@/app/(app)/import/actions";
import { formatDatetimeBR } from "@/lib/dates";

interface Props {
  batches: DBImportBatch[];
  holders: DBHolder[];
}

export function ImportHistoryList({ batches, holders }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localBatches, setLocalBatches] = useState(batches);

  const holderName = (holderId: string) =>
    holders.find((h) => h.id === holderId)?.name ?? "—";

  async function handleDelete(batchId: string) {
    setDeletingId(batchId);
    const res = await deleteImportBatch(batchId);
    if (res.success) {
      setLocalBatches((prev) => prev.filter((b) => b.id !== batchId));
    }
    setDeletingId(null);
    setConfirmId(null);
  }

  if (localBatches.length === 0) return null;

  return (
    <div>
      <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-2)", marginBottom: "12px" }}>
        Histórico de importações
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {localBatches.slice(0, 10).map((b) => {
          const statusColor =
            b.status === "completed"
              ? "var(--color-gain)"
              : b.status === "failed"
                ? "var(--color-crit)"
                : "var(--color-text-3)";
          const isConfirming = confirmId === b.id;
          const isDeleting = deletingId === b.id;

          return (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: `1px solid ${isConfirming ? "var(--color-crit)" : "var(--color-line-2)"}`,
                backgroundColor: isConfirming ? "color-mix(in srgb, var(--color-crit) 6%, var(--color-bg-2))" : "var(--color-bg-2)",
                fontSize: "12.5px",
                transition: "border-color 0.15s, background-color 0.15s",
              }}
            >
              <span className="dot" style={{ backgroundColor: statusColor, flexShrink: 0 }} />
              <span style={{ fontWeight: 500, minWidth: "50px" }}>
                {b.institution.toUpperCase()}
              </span>
              <span style={{ color: "var(--color-text-3)", fontSize: "12px" }}>
                {holderName(b.holder_id)}
              </span>
              <span style={{ color: "var(--color-text-3)", flex: 1 }}>{b.filename ?? "—"}</span>
              {b.row_count !== null && (
                <span className="num" style={{ color: "var(--color-text-2)" }}>
                  {b.row_count} posições
                </span>
              )}
              <span className="num" style={{ color: "var(--color-text-3)", whiteSpace: "nowrap" }}>
                {formatDatetimeBR(b.imported_at)}
              </span>

              {/* Delete controls */}
              {b.status === "completed" && (
                isConfirming ? (
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={isDeleting}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "4px",
                        border: "1px solid var(--color-crit)",
                        backgroundColor: "var(--color-crit)",
                        color: "#fff",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        opacity: isDeleting ? 0.6 : 1,
                      }}
                    >
                      {isDeleting ? "..." : "Excluir"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "4px",
                        border: "1px solid var(--color-line)",
                        backgroundColor: "transparent",
                        color: "var(--color-text-2)",
                        fontSize: "11.5px",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(b.id)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--color-line)",
                      backgroundColor: "transparent",
                      color: "var(--color-text-3)",
                      fontSize: "11.5px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Remover
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
