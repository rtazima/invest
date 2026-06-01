"use client";

import { useState } from "react";
import type { DBCouncilMessage } from "@/types/database";
import { Markdown } from "@/components/ui/Markdown";

interface Props {
  message: DBCouncilMessage;
  holderId: string;
}

export function SynthesisView({ message }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid var(--color-gain)", backgroundColor: "rgba(34,197,94,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-gain)" }}>
          Síntese final
        </div>
        <button
          onClick={handleCopy}
          style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "4px", border: "1px solid var(--color-line)", backgroundColor: "transparent", color: "var(--color-text-3)", cursor: "pointer" }}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <Markdown>{message.content}</Markdown>
    </div>
  );
}
