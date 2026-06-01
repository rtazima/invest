"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CouncilSessionFull } from "@/lib/data/council";
import { ParticipantCard } from "./ParticipantCard";
import { HumanInputForm } from "./HumanInputForm";
import { SynthesisView } from "./SynthesisView";

interface Props {
  session: CouncilSessionFull;
  holderId: string;
}

const STATUS_LABELS: Record<string, string> = {
  round1_pending: "Rodada 1 em andamento",
  round2_pending: "Rodada 2 em andamento",
  synthesizing: "Gerando consenso...",
  completed: "Concluído",
};

function currentRoundFromStatus(status: string): number {
  if (status === "round1_pending") return 1;
  return 2;
}

export function SessionView({ session, holderId }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTriggeredRef = useRef(false);

  const currentRound = currentRoundFromStatus(session.status);
  const isCompleted = session.status === "completed";
  const isSynthesizing = session.status === "synthesizing";

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      router.refresh();
    }, 3000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  // Stop polling when done; keep it going while work is in progress
  useEffect(() => {
    if (isCompleted) {
      stopPolling();
    } else {
      startPolling();
    }
    return () => stopPolling();
  }, [session.status, isCompleted]);

  async function triggerRound(round: 0 | 1 | 2) {
    setError("");
    startPolling(); // start immediately — don't wait for fetch to resolve
    try {
      const res = await fetch("/api/council/run-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, round }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Erro ao chamar os modelos.");
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    }
  }

  // Auto-trigger round 1 when session loads with no LLM messages yet
  const hasAnyLlmMessage = session.participants.some(
    (p) => p.type === "llm" && p.messages.length > 0,
  );
  useEffect(() => {
    if (
      session.status === "round1_pending" &&
      !hasAnyLlmMessage &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      triggerRound(1);
    }
  }, []);

  // Human participants still pending in current round
  const pendingHumans =
    !isCompleted
      ? session.participants.filter(
          (p) => p.type === "human" && !p.messages.some((m) => m.round === currentRound),
        )
      : [];

  const llmRound2Triggered = session.participants
    .filter((p) => p.type === "llm")
    .some((p) => p.messages.some((m) => m.round === 2));

  const showRound2Button =
    session.status === "round2_pending" &&
    !llmRound2Triggered &&
    pendingHumans.length === 0;

  // Synthesis stuck recovery: status=synthesizing but no synthesis message yet
  const showSynthesisRecovery = isSynthesizing && !session.synthesis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderRadius: "6px",
          backgroundColor: "var(--color-bg-2)",
          border: "1px solid var(--color-line-2)",
        }}
      >
        <span style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>
          {STATUS_LABELS[session.status] ?? session.status}
          {!isCompleted && !isSynthesizing && " — aguardando respostas..."}
        </span>
        <span style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
          {session.participants.length} participante{session.participants.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-crit)" }}>{error}</p>
      )}

      {/* Human input forms */}
      {pendingHumans.map((p) => (
        <HumanInputForm
          key={p.id}
          holderId={holderId}
          sessionId={session.id}
          participantId={p.id}
          participantName={p.name}
          round={currentRound}
        />
      ))}

      {/* Start Round 2 button */}
      {showRound2Button && (
        <button
          onClick={() => triggerRound(2)}
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            backgroundColor: "var(--color-text)",
            border: "none",
            color: "var(--color-bg)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          Iniciar Rodada 2 — Debate
        </button>
      )}

      {/* Synthesis stuck recovery */}
      {showSynthesisRecovery && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "8px",
            border: "1px dashed var(--color-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--color-text-2)" }}>
            Gerando consenso com Claude Opus...
          </span>
          <button
            onClick={() => triggerRound(0)}
            style={{
              fontSize: "12px",
              padding: "5px 12px",
              borderRadius: "5px",
              border: "1px solid var(--color-line)",
              backgroundColor: "transparent",
              color: "var(--color-text-2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Synthesis result */}
      {session.synthesis && (
        <SynthesisView
          synthesis={session.synthesis}
          strategyHref={`/holders/${holderId}/strategy`}
        />
      )}

      {/* Participant cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {session.participants.map((p) => (
          <ParticipantCard key={p.id} participant={p} currentRound={currentRound} />
        ))}
      </div>
    </div>
  );
}
