"use client";

import { useState, useTransition } from "react";
import type { FamilyAdvisor } from "@/lib/data/advisors";
import { inviteAdvisorAction, revokeAdvisorAction } from "@/app/(app)/familia/advisor-actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontSize: "0.8125rem",
  boxSizing: "border-box",
};

const ROLE_LABELS: Record<string, string> = {
  advisor_read: "Só leitura",
  advisor_write: "Leitura e edição",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  revoked: "Revogado",
};

interface Props {
  familyId: string;
  advisors: FamilyAdvisor[];
}

export function AdvisorsPanel({ familyId, advisors }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"advisor_read" | "advisor_write">("advisor_read");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);

  function handleInvite() {
    if (!email.trim() || !email.includes("@")) {
      setError("Email inválido.");
      return;
    }
    setError("");
    setInviteLink(null);
    startTransition(async () => {
      try {
        const { inviteToken } = await inviteAdvisorAction(familyId, email, role);
        const link = `${window.location.origin}/invite/accept?token=${inviteToken}`;
        setInviteLink(link);
        setEmail("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao gerar convite.");
      }
    });
  }

  function handleCopyLink(link: string, id: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleRevoke(advisorId: string) {
    setRevoking(advisorId);
    startTransition(async () => {
      try {
        await revokeAdvisorAction(advisorId);
      } catch {
        // silently ignore
      } finally {
        setRevoking(null);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Lista de assessores */}
      {advisors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {advisors.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                {a.invited_email.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.invited_email}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  {ROLE_LABELS[a.role]}
                </p>
              </div>

              <span
                style={{
                  fontSize: "0.6875rem",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "999px",
                  backgroundColor: a.status === "active" ? "rgba(34,197,94,0.12)" : "var(--color-border)",
                  color: a.status === "active" ? "var(--color-gain)" : "var(--color-text-muted)",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {STATUS_LABELS[a.status]}
              </span>

              {/* Copiar link (só pendentes) */}
              {a.status === "pending" && (
                <button
                  onClick={() => handleCopyLink(`${window.location.origin}/invite/accept?token=${a.invite_token}`, a.id)}
                  style={{
                    fontSize: "0.6875rem",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {copiedId === a.id ? "Copiado!" : "Copiar link"}
                </button>
              )}

              {/* Revogar */}
              {a.status !== "revoked" && (
                <button
                  onClick={() => handleRevoke(a.id)}
                  disabled={revoking === a.id}
                  style={{
                    fontSize: "0.6875rem",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "transparent",
                    color: "var(--color-crit, #ef4444)",
                    cursor: "pointer",
                    flexShrink: 0,
                    opacity: revoking === a.id ? 0.5 : 1,
                  }}
                >
                  Revogar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulário de convite */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.5rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 500, color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              Email do assessor
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="assessor@exemplo.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 500, color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              Permissão
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "advisor_read" | "advisor_write")}
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value="advisor_read">Só leitura</option>
              <option value="advisor_write">Leitura e edição</option>
            </select>
          </div>
          <button
            onClick={handleInvite}
            disabled={isPending}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-text)",
              border: "none",
              color: "var(--color-bg)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "Gerando..." : "Convidar"}
          </button>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-crit, #ef4444)" }}>{error}</p>
        )}

        {inviteLink && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <code style={{ flex: 1, fontSize: "0.75rem", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {inviteLink}
            </code>
            <button
              onClick={() => handleCopyLink(inviteLink, "new")}
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.625rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {copiedId === "new" ? "Copiado!" : "Copiar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
