import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Invest",
};

export default function DashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginTop: "0.25rem",
          }}
        >
          Portfólio consolidado da família
        </p>
      </div>

      {/* Placeholder — implementado na Etapa 6 */}
      <div
        style={{
          padding: "3rem",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          Dashboard em construção — Etapa 6
        </p>
        <p style={{ color: "var(--color-text-faint)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Importe seu portfólio para começar
        </p>
      </div>
    </div>
  );
}
