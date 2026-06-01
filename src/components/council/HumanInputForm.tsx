"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitHumanMessageAction, skipHumanRoundAction } from "@/app/(app)/holders/[holderId]/council/actions";

interface Props {
  holderId: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  round: number;
}

export function HumanInputForm({ holderId, sessionId, participantId, participantName, round }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!content.trim()) { setError("Escreva sua recomendação antes de enviar."); return; }
    setError("");
    startTransition(async () => {
      try {
        await submitHumanMessageAction(holderId, sessionId, participantId, round, content);
        setContent("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao enviar.");
      }
    });
  }

  function handleSkip() {
    startTransition(async () => {
      await skipHumanRoundAction(holderId, sessionId, participantId, round);
      router.refresh();
    });
  }

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid var(--color-text)",
        backgroundColor: "var(--color-bg-2)",
        marginTop: "8px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-2)", marginBottom: "8px" }}>
        {participantName} — sua recomendação (Rodada {round})
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Escreva sua análise e recomendação..."
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontSize: "13px",
          boxSizing: "border-box",
          resize: "vertical" as const,
          fontFamily: "inherit",
        }}
      />
      {error && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-crit)" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button
          onClick={handleSubmit}
          disabled={pending}
          style={{
            padding: "7px 16px",
            borderRadius: "6px",
            backgroundColor: "var(--color-text)",
            border: "none",
            color: "var(--color-bg)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
        <button
          onClick={handleSkip}
          disabled={pending}
          style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: "1px solid var(--color-line)",
            backgroundColor: "transparent",
            color: "var(--color-text-3)",
            fontSize: "12.5px",
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          Pular
        </button>
      </div>
    </div>
  );
}
