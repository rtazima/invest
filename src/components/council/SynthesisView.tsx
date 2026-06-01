"use client";

import { useState } from "react";
import type { DBCouncilMessage } from "@/types/database";

interface Props {
  synthesis: DBCouncilMessage;
  strategyHref: string;
}

export function SynthesisView({ synthesis, strategyHref }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(synthesis.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-gain)",
        backgroundColor: "var(--color-bg-2)",
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-gain)" }}>
          Consenso final
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleCopy}
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "1px solid var(--color-line)",
              backgroundColor: "transparent",
              color: "var(--color-text-2)",
              cursor: "pointer",
            }}
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <a
            href={strategyHref}
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "var(--color-text)",
              color: "var(--color-bg)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Ver estratégia
          </a>
        </div>
      </div>

      <div
        style={{
          padding: "20px",
          fontSize: "13.5px",
          lineHeight: "1.7",
          color: "var(--color-text)",
          whiteSpace: "pre-wrap",
        }}
      >
        {synthesis.content}
      </div>

      <div style={{ padding: "0 20px 12px", fontSize: "11.5px", color: "var(--color-text-3)" }}>
        Gerado em {new Date(synthesis.created_at).toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
