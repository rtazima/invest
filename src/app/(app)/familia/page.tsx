import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { getAdvisors } from "@/lib/data/advisors";
import { AddMemberForm } from "@/components/familia/AddMemberForm";
import { EditMemberForm } from "@/components/familia/EditMemberForm";
import { AdvisorsPanel } from "@/components/familia/AdvisorsPanel";
import { formatCPF } from "@/lib/cpf";
import { computeIsMinor } from "./actions";
import { DeleteMemberButton } from "@/components/familia/DeleteMemberButton";

export const metadata: Metadata = {
  title: "Família — Invest",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  searchParams: Promise<{ edit?: string; error?: string }>;
};

export default async function FamiliaPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const holders = await getHolders();
  const myHolder = holders.find((h) => h.user_id === user.id);

  if (myHolder?.role !== "owner") {
    redirect("/dashboard");
  }

  const familyId = myHolder.family_id;
  const advisors = familyId ? await getAdvisors(familyId) : [];
  const params = await searchParams;
  const editHolderId = params.edit ?? null;
  const errorMsg = params.error ?? null;

  return (
    <div style={{ maxWidth: "640px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)", margin: "0 0 0.25rem" }}>
          Família
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
          Titulares cadastrados e membros pré-registrados.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.5rem 0.75rem",
            backgroundColor: "var(--color-critical-subtle)",
            border: "1px solid var(--color-critical)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-critical)",
            fontSize: "0.8125rem",
          }}
        >
          {errorMsg}
        </div>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
          Titulares
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {holders.map((h) => {
            const isEditing = editHolderId === h.id;
            const isOwner = h.role === "owner";
            const minor = computeIsMinor(h.birth_date);

            return (
              <div
                key={h.id}
                style={{
                  padding: "0.875rem 1rem",
                  backgroundColor: "var(--color-surface)",
                  border: `1px solid ${isEditing ? "var(--color-brand)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                }}
              >
                {isEditing ? (
                  <EditMemberForm holder={h} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-brand)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {h.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 500, color: "var(--color-text)", fontSize: "0.875rem" }}>
                        {h.name}
                        {h.full_name && h.full_name !== h.name && (
                          <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                            {" "}— {h.full_name}
                          </span>
                        )}
                        {minor && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.6875rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "999px",
                              backgroundColor: "var(--color-border)",
                              color: "var(--color-text-muted)",
                              fontWeight: 500,
                              verticalAlign: "middle",
                            }}
                          >
                            menor
                          </span>
                        )}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
                        {h.cpf ? <span style={{ fontFamily: "var(--font-mono)" }}>CPF {formatCPF(h.cpf)}</span> : null}
                        {h.birth_date ? (
                          <span style={{ marginLeft: h.cpf ? "0.75rem" : 0 }}>
                            nasc. {formatDate(h.birth_date)}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    {/* Role badge + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "999px",
                          backgroundColor: isOwner ? "var(--color-brand)" : "var(--color-border)",
                          color: isOwner ? "white" : "var(--color-text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        {isOwner ? "owner" : h.user_id ? "membro" : "pendente"}
                      </span>

                      {/* Editar */}
                      <a
                        href={`/familia?edit=${h.id}`}
                        title="Editar"
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          color: "var(--color-text-muted)",
                          textDecoration: "none",
                          backgroundColor: "transparent",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11 2l3 3L5 14H2v-3L11 2Z" />
                        </svg>
                      </a>

                      {/* Excluir (apenas não-owners) */}
                      {!isOwner && (
                        <DeleteMemberButton holderId={h.id} holderName={h.name} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Assessores */}
      {familyId && !editHolderId && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            Assessores
          </h2>
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <AdvisorsPanel familyId={familyId} advisors={advisors} />
          </div>
        </section>
      )}

      {/* Adicionar membro */}
      {familyId && !editHolderId && (
        <section>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            Adicionar membro
          </h2>
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <AddMemberForm familyId={familyId} />
          </div>
        </section>
      )}
    </div>
  );
}
