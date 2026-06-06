"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMercadoPagoPositions } from "@/app/(app)/import/actions";

interface Entry {
  id: number;
  name: string;
  value: string;
}

let nextId = 1;
function mkEntry(): Entry {
  return { id: nextId++, name: "", value: "" };
}

export function MercadoPagoForm({ holders }: { holders: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [holderId, setHolderId] = useState(holders[0]?.id ?? "");
  const [entries, setEntries] = useState<Entry[]>([mkEntry()]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function addEntry() {
    setEntries((prev) => [...prev, mkEntry()]);
  }

  function removeEntry(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntry(id: number, field: "name" | "value", val: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  }

  function submit() {
    setError(null);
    setSuccess(false);

    const parsed = entries
      .filter((e) => e.name.trim() && e.value.trim())
      .map((e) => ({
        name: e.name.trim(),
        valueBrl: parseFloat(e.value.replace(",", ".")),
      }))
      .filter((e) => !isNaN(e.valueBrl) && e.valueBrl > 0);

    if (!holderId) {
      setError("Selecione um titular.");
      return;
    }
    if (parsed.length === 0) {
      setError("Adicione pelo menos um cofrinho com nome e valor válidos.");
      return;
    }

    startTransition(async () => {
      const result = await saveMercadoPagoPositions(holderId, parsed);
      if (result.success) {
        setSuccess(true);
        setEntries([mkEntry()]);
        router.refresh();
      } else {
        setError(result.errorMessage ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--color-text-2)", marginBottom: "6px" }}>
          Titular
        </label>
        <select
          value={holderId}
          onChange={(e) => setHolderId(e.target.value)}
          disabled={isPending}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid var(--color-line-2)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            fontSize: "13px",
          }}
        >
          {holders.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--color-text-2)", marginBottom: "8px" }}>
          Cofrinhos
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Nome (ex: Reserva emergência)"
                value={entry.name}
                onChange={(e) => updateEntry(entry.id, "name", e.target.value)}
                disabled={isPending}
                style={{
                  flex: 2,
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-line-2)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "13px",
                }}
              />
              <input
                type="text"
                placeholder="Valor (R$)"
                value={entry.value}
                onChange={(e) => updateEntry(entry.id, "value", e.target.value)}
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-line-2)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "13px",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  disabled={isPending}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-3)",
                    cursor: "pointer",
                    fontSize: "16px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "16px" }}>
        <button
          type="button"
          onClick={addEntry}
          disabled={isPending}
          style={{
            padding: "7px 14px",
            borderRadius: "6px",
            border: "1px solid var(--color-line-2)",
            backgroundColor: "transparent",
            color: "var(--color-text-2)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          + Adicionar cofrinho
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          style={{
            padding: "7px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {error && (
        <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--color-danger)" }}>{error}</p>
      )}
      {success && (
        <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--color-success)" }}>
          Cofrinhos salvos com sucesso.
        </p>
      )}
    </div>
  );
}
