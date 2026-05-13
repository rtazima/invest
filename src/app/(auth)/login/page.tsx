import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar — Invest",
};

export default function LoginPage() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "2rem",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: "0.5rem",
          }}
        >
          Invest
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginBottom: "1.5rem",
          }}
        >
          Gestão patrimonial familiar
        </p>
        {/* Formulário de login será implementado na Etapa 2 (Auth) */}
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-faint)",
            textAlign: "center",
          }}
        >
          Auth em implementação — Etapa 2
        </p>
      </div>
    </div>
  );
}
