"use client";

import type { CouncilParticipantFull } from "@/lib/data/council";

interface Props {
  participant: CouncilParticipantFull;
  currentRound: number;
}

const ROUND_LABELS: Record<number, string> = {
  1: "Rodada 1 — Posição inicial",
  2: "Rodada 2 — Debate",
};

const MODEL_SHORT: Record<string, string> = {
  "claude-opus-4-7": "Opus 4.7",
  "gpt-4o": "GPT-4o",
};

export function ParticipantCard({ participant, currentRound }: Props) {
  const round1 = participant.messages.find((m) => m.round === 1);
  const round2 = participant.messages.find((m) => m.round === 2);

  const isWaiting = (round: number) => {
    if (round > currentRound) return false;
    const msg = participant.messages.find((m) => m.round === round);
    return !msg;
  };

  const isError = (content: string) => content.startsWith("[Erro:");
  const isSkipped = (content: string) => content.startsWith("[Participante optou");

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg-2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-line-2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "var(--color-bg-3)",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
          {participant.name}
        </span>
        <span
          style={{
            fontSize: "11px",
            padding: "2px 7px",
            borderRadius: "4px",
            backgroundColor: participant.type === "llm" ? "var(--color-bg)" : "var(--color-bg-2)",
            border: "1px solid var(--color-line)",
            color: "var(--color-text-3)",
          }}
        >
          {participant.type === "llm"
            ? MODEL_SHORT[participant.model ?? ""] ?? participant.model
            : "Humano"}
        </span>
        {participant.role_focus && (
          <span style={{ fontSize: "11.5px", color: "var(--color-text-3)" }}>
            {participant.role_focus}
          </span>
        )}
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {[1, 2].map((round) => {
          const msg = round === 1 ? round1 : round2;
          if (round > currentRound && !msg) return null;

          return (
            <div key={round}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-text-3)",
                  marginBottom: "8px",
                }}
              >
                {ROUND_LABELS[round]}
              </div>

              {isWaiting(round) ? (
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "var(--color-text-3)",
                    fontStyle: "italic",
                  }}
                >
                  Aguardando resposta...
                </div>
              ) : msg ? (
                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.65",
                    color: isError(msg.content)
                      ? "var(--color-crit)"
                      : isSkipped(msg.content)
                      ? "var(--color-text-3)"
                      : "var(--color-text-2)",
                    whiteSpace: "pre-wrap",
                    fontStyle: isSkipped(msg.content) ? "italic" : "normal",
                  }}
                >
                  {msg.content}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
