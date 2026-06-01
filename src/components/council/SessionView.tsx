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
  if (status === "round2_pending") return 2;
  return 2;
}

export function SessionView({ session, holderId }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentRound = currentRoundFromStatus(session.status);
  const isActive = session.status !== "completed";
  const isSynthesizing = session.status === "synthesizing";

  async function triggerRound(round: 0 | 1 | 2) {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/council/run-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, round }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Erro ao chamar os modelos.");
      } else {
        startPolling();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setRunning(false);
    }
  }

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      router.refresh();
    }, 3500);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => {
    if (session.status === "completed" || session.status === "round2_pending") {
      stopPolling();
    }
    if (session.status === "synthesizing") {
      startPolling();
    }
    return () => stopPolling();
  }, [session.status]);

  // Auto-trigger round 1 LLMs when session first loads in round1_pending with no messages yet
  const hasAnyLlmMessage = session.participants.some(
    (p) => p.type === "llm" && p.messages.length > 0,
  );
  const autoTriggeredRef = useRef(false);
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

  // Find human participants that still need to respond in the current round
  const pendingHumans = isActive
    ? session.participants.filter(
        (p) =>
          p.type === "human" &&
          !p.messages.some((m) => m.round === currentRound),
      )
    : [];

  const llmRound2Triggered = session.participants
    .filter((p) => p.type === "llm")
    .some((p) => p.messages.some((m) => m.round === 2));

  function handleStartRound2() {
    triggerRound(2);
  }

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
          {running && " — processando..."}
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

      {/* Start Round 2 button — shown when round 1 is complete and round 2 LLMs not yet triggered */}
      {session.status === "round2_pending" && !llmRound2Triggered && pendingHumans.length === 0 && (
        <button
          onClick={handleStartRound2}
          disabled={running}
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            backgroundColor: "var(--color-text)",
            border: "none",
            color: "var(--color-bg)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.7 : 1,
            alignSelf: "flex-start",
          }}
        >
          {running ? "Iniciando debate..." : "Iniciar Rodada 2 — Debate"}
        </button>
      )}

      {/* Synthesis banner while synthesizing */}
      {isSynthesizing && !session.synthesis && (
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            border: "1px dashed var(--color-gain)",
            color: "var(--color-gain)",
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          Gerando consenso com Claude Opus...
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
