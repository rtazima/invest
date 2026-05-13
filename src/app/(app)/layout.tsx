import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Sidebar placeholder — implementado na Etapa 6 */}
      <aside
        style={{
          width: "56px",
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: "var(--z-sidebar)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0.75rem 0",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            backgroundColor: "var(--color-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: 700,
            color: "white",
          }}
        >
          I
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div style={{ marginLeft: "56px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header placeholder — implementado na Etapa 6 */}
        <header
          style={{
            height: "48px",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg)",
            position: "sticky",
            top: 0,
            zIndex: "var(--z-header)",
            display: "flex",
            alignItems: "center",
            padding: "0 1.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            Invest
          </span>
        </header>

        <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
      </div>
    </div>
  );
}
