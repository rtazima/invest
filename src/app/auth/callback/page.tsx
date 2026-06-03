"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  useEffect(() => {
    const fail = (msg: string) => {
      console.error("[auth/callback]", msg);
      setDebugMsg(msg);
      setFailed(true);
    };

    const getCookieValue = (name: string): string | null => {
      try {
        const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
        return match ? decodeURIComponent(match[1] ?? "") : null;
      } catch {
        return null;
      }
    };

    const finishAuth = (ok: boolean, reason?: string) => {
      if (!ok) { fail(reason ?? "Falha na autenticação."); return; }
      const next = getCookieValue("auth_redirect") ?? "/dashboard";
      document.cookie = "auth_redirect=; path=/; max-age=0; samesite=lax";
      router.replace(next);
    };

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (err) {
      fail(`createClient: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error) {
            finishAuth(false, `exchangeCodeForSession: ${error.message}`);
          } else {
            finishAuth(!!data.session, "sessão nula após troca de código");
          }
        })
        .catch((err: unknown) => {
          fail(`exchangeCodeForSession threw: ${err instanceof Error ? err.message : String(err)}`);
        });
      return;
    }

    // Implicit flow / hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          subscription.unsubscribe();
          finishAuth(!!session, "SIGNED_IN sem sessão");
        }
      }
    );

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          subscription.unsubscribe();
          finishAuth(true);
        }
      })
      .catch((err: unknown) => {
        fail(`getSession threw: ${err instanceof Error ? err.message : String(err)}`);
      });

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      fail("Timeout aguardando autenticação (10s).");
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (failed) {
    return (
      <div style={{
        display: "flex", minHeight: "100dvh",
        alignItems: "center", justifyContent: "center",
        backgroundColor: "var(--color-bg)", padding: "1rem",
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <p style={{ color: "var(--color-critical)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            Link expirado ou já utilizado. Solicite um novo.
          </p>
          {debugMsg && (
            <p style={{
              color: "var(--color-text-muted)", fontSize: "0.7rem",
              fontFamily: "monospace", marginBottom: "1rem",
              wordBreak: "break-all",
            }}>
              {debugMsg}
            </p>
          )}
          <a href="/login" style={{ color: "var(--color-brand)", fontSize: "0.875rem" }}>
            Voltar ao login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", minHeight: "100dvh",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "var(--color-bg)",
    }}>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
        Autenticando...
      </p>
    </div>
  );
}
