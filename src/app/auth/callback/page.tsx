"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const getCookieValue = (name: string): string | null => {
      const match = document.cookie.match(
        new RegExp(`(?:^|; )${name}=([^;]*)`)
      );
      return match ? decodeURIComponent(match[1] ?? "") : null;
    };

    const finishAuth = (ok: boolean) => {
      if (!ok) { setFailed(true); return; }
      const next = getCookieValue("auth_redirect") ?? "/dashboard";
      document.cookie = "auth_redirect=; path=/; max-age=0; samesite=lax";
      router.replace(next);
    };

    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      // PKCE flow: verifier was stored by the browser client — exchange here too
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error }) => finishAuth(!error && !!data.session));
      return;
    }

    // Implicit flow or token in hash: listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          subscription.unsubscribe();
          finishAuth(!!session);
        }
      }
    );

    // Also check if session already exists (event may have fired before listener)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        finishAuth(true);
      }
    });

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setFailed(true);
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
        <div style={{ textAlign: "center", maxWidth: "340px" }}>
          <p style={{
            color: "var(--color-critical)", marginBottom: "1rem",
            fontSize: "0.875rem",
          }}>
            Link expirado ou já utilizado. Solicite um novo.
          </p>
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
