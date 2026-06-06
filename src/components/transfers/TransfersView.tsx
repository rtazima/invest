"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TransferEvent } from "@/lib/data/transfers";
import { settleTransferEvent, cancelTransferEvent } from "@/app/(app)/transfers/actions";

interface Props {
  events: TransferEvent[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Em andamento",
  settled: "Liquidado",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-warn)",
  settled: "var(--color-gain)",
  cancelled: "var(--color-text-3)",
};

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function TransferRow({ event }: { event: TransferEvent }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  function settle() {
    setLocalError(null);
    startTransition(async () => {
      const result = await settleTransferEvent(event.id);
      if (result.error) {
        setLocalError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function cancel() {
    setLocalError(null);
    startTransition(async () => {
      const result = await cancelTransferEvent(event.id);
      if (result.error) {
        setLocalError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const rowStyle: React.CSSProperties = {
    opacity: event.status === "cancelled" ? 0.5 : 1,
  };

  return (
    <tr className="hairline" style={rowStyle}>
      <td style={{ padding: "10px 8px 10px 16px", whiteSpace: "nowrap" }}>
        <div style={{ fontWeight: 500, fontSize: "13px" }}>
          {event.ticker ?? event.asset_name.split(" ").slice(0, 3).join(" ")}
        </div>
        {event.ticker && (
          <div style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>{event.asset_name}</div>
        )}
      </td>
      <td style={{ padding: "10px 8px", color: "var(--color-text-2)", fontSize: "13px" }}>
        {event.holder_name}
      </td>
      <td style={{ padding: "10px 8px", fontSize: "13px", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 500 }}>{event.from_institution.toUpperCase()}</span>
        <span style={{ color: "var(--color-text-3)", margin: "0 6px" }}>→</span>
        <span style={{ fontWeight: 500 }}>{event.to_institution.toUpperCase()}</span>
      </td>
      <td style={{ padding: "10px 8px", textAlign: "right" }}>
        <span className="num" style={{ fontSize: "13px" }}>{fmt(event.quantity)}</span>
      </td>
      <td style={{ padding: "10px 8px", fontSize: "12.5px", color: "var(--color-text-2)", whiteSpace: "nowrap" }}>
        {fmtDate(event.transfer_date)}
      </td>
      <td style={{ padding: "10px 8px", fontSize: "12.5px", color: "var(--color-text-2)", whiteSpace: "nowrap" }}>
        {fmtDate(event.settlement_date)}
      </td>
      <td style={{ padding: "10px 8px" }}>
        <span
          style={{
            fontSize: "11.5px",
            color: STATUS_COLOR[event.status] ?? "var(--color-text-2)",
            fontWeight: 500,
          }}
        >
          {STATUS_LABEL[event.status] ?? event.status}
        </span>
      </td>
      <td style={{ padding: "10px 16px 10px 8px" }}>
        {event.status === "pending" && (
          <div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={settle}
                disabled={isPending}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border: "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                  color: isPending ? "var(--color-text-3)" : "var(--color-gain)",
                  cursor: isPending ? "not-allowed" : "pointer",
                  fontSize: "12px",
                }}
              >
                {isPending ? "Aguarde..." : "Liquidar"}
              </button>
              <button
                onClick={cancel}
                disabled={isPending}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border: "1px solid var(--color-line)",
                  backgroundColor: "transparent",
                  color: "var(--color-text-3)",
                  cursor: isPending ? "not-allowed" : "pointer",
                  fontSize: "12px",
                }}
              >
                Cancelar
              </button>
            </div>
            {localError && (
              <div style={{ fontSize: "11px", color: "var(--color-crit)", marginTop: "4px" }}>
                {localError}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export function TransfersView({ events }: Props) {
  const pending = events.filter((e) => e.status === "pending").length;

  const thStyle: React.CSSProperties = {
    padding: "8px",
    textAlign: "left" as const,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "var(--color-text-3)",
    fontWeight: 400,
    whiteSpace: "nowrap" as const,
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Transferências de custódia</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-3)", marginTop: "4px" }}>
          {pending > 0
            ? `${pending} transferência${pending !== 1 ? "s" : ""} em andamento — ativos suprimidos da origem até a liquidação.`
            : "Nenhuma transferência em andamento."}
        </p>
      </div>

      {events.length === 0 ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "var(--color-text-3)",
            border: "1px solid var(--color-line)",
            borderRadius: "8px",
            fontSize: "13.5px",
          }}
        >
          Nenhuma transferência registrada. Selecione posições no Dashboard e clique em &quot;Transferir&quot;.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr className="hairline">
                <th style={{ ...thStyle, paddingLeft: "16px" }}>Ativo</th>
                <th style={thStyle}>Titular</th>
                <th style={thStyle}>Rota</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Qtd</th>
                <th style={thStyle}>Transferência</th>
                <th style={thStyle}>Liquidação</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, paddingRight: "16px" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <TransferRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
