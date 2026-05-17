import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { AddMemberForm } from "@/components/familia/AddMemberForm";
import { formatCPF } from "@/lib/cpf";

export const metadata: Metadata = {
  title: "Família — Invest",
};

export default async function FamiliaPage() {
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

  return (
    <div style={{ maxWidth: "640px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: "0 0 0.25rem",
          }}
        >
          Família
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
          Titulares cadastrados e membros pré-registrados.
        </p>
      </div>

      {/* Titulares com conta */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
          Titulares
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {holders.map((h) => (
            <div
              key={h.id}
              style={{
                padding: "0.875rem 1rem",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
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
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500, color: "var(--color-text)", fontSize: "0.875rem" }}>
                  {h.name}
                  {h.full_name && h.full_name !== h.name && (
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                      {" "}— {h.full_name}
                    </span>
                  )}
                </p>
                {h.cpf && (
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                    CPF {formatCPF(h.cpf)}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontSize: "0.6875rem",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "999px",
                  backgroundColor: h.role === "owner" ? "var(--color-brand)" : "var(--color-border)",
                  color: h.role === "owner" ? "white" : "var(--color-text-muted)",
                  fontWeight: 500,
                }}
              >
                {h.role === "owner" ? "owner" : h.user_id ? "membro" : "pendente"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Adicionar membro */}
      {familyId && (
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
