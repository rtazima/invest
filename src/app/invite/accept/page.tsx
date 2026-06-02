import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAdvisorByToken } from "@/lib/data/advisors";

export const metadata: Metadata = { title: "Aceitar convite — Invest" };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

async function acceptInviteAction(token: string): Promise<void> {
  "use server";
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login`);

  const { error } = await supabase
    .from("family_advisors")
    .update({
      user_id: user.id,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("invite_token", token)
    .eq("invited_email", user.email!)
    .eq("status", "pending");

  if (error) throw new Error("Convite inválido ou já utilizado.");

  // Marca como onboarded para o middleware deixar passar
  await supabase.auth.updateUser({ data: { onboarded: true } });

  redirect("/dashboard");
}

export default async function InviteAcceptPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Link inválido</h1>
          <p style={descStyle}>Este link de convite não é válido.</p>
        </div>
      </div>
    );
  }

  const advisor = await getAdvisorByToken(token);

  if (!advisor || advisor.status === "revoked") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Convite inválido</h1>
          <p style={descStyle}>Este convite foi revogado ou não existe.</p>
        </div>
      </div>
    );
  }

  if (advisor.status === "active") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Convite já aceito</h1>
          <p style={descStyle}>Este convite já foi aceito anteriormente.</p>
          <a href="/dashboard" style={btnStyle}>Ir para o dashboard</a>
        </div>
      </div>
    );
  }

  // Verifica sessão atual
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ROLE_LABELS: Record<string, string> = {
    advisor_read: "Só leitura",
    advisor_write: "Leitura e edição",
  };

  if (!user) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Convite para a plataforma Invest</h1>
          <p style={descStyle}>
            Você foi convidado como assessor com permissão de{" "}
            <strong>{ROLE_LABELS[advisor.role]}</strong>.
          </p>
          <p style={{ ...descStyle, fontSize: "0.75rem" }}>
            Para aceitar, faça login com o email <strong>{advisor.invited_email}</strong>.
          </p>
          <a
            href={`/login?email=${encodeURIComponent(advisor.invited_email)}&next=${encodeURIComponent(`/invite/accept?token=${token}`)}`}
            style={btnStyle}
          >
            Fazer login
          </a>
        </div>
      </div>
    );
  }

  if (user.email?.toLowerCase() !== advisor.invited_email.toLowerCase()) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Email incorreto</h1>
          <p style={descStyle}>
            Este convite é para <strong>{advisor.invited_email}</strong>, mas você está logado como{" "}
            <strong>{user.email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const boundAction = acceptInviteAction.bind(null, token);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Convite para a plataforma Invest</h1>
        <p style={descStyle}>
          Você foi convidado como assessor com permissão de{" "}
          <strong>{ROLE_LABELS[advisor.role]}</strong>.
        </p>
        <form action={boundAction}>
          <button type="submit" style={btnStyle}>
            Aceitar convite
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100dvh",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "var(--color-bg)",
  padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  padding: "2rem",
  backgroundColor: "var(--color-surface)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border)",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.125rem",
  fontWeight: 700,
  color: "var(--color-text)",
};

const descStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  color: "var(--color-text-muted)",
  lineHeight: 1.6,
};

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: "0.5rem",
  padding: "0.625rem 1.25rem",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--color-text)",
  color: "var(--color-bg)",
  fontSize: "0.875rem",
  fontWeight: 600,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};
