import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

const PUBLIC_ROUTES = ["/login", "/register", "/auth/callback", "/invite"];
const MFA_ROUTES = ["/mfa/enroll", "/mfa/verify"];
const ONBOARDING_ROUTE = "/onboarding";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isMfaRoute = MFA_ROUTES.some((r) => pathname.startsWith(r));
  const isOnboarding = pathname.startsWith(ONBOARDING_ROUTE);

  // Não autenticado
  if (!user) {
    if (isPublic || isMfaRoute || isOnboarding) return supabaseResponse;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticado + tentando acessar /login ou /register
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rotas MFA e onboarding: acessíveis sem aal2
  if (isMfaRoute || isOnboarding) return supabaseResponse;

  // Bypass para usuário de teste E2E (apenas em desenvolvimento)
  const isE2EUser = process.env.NODE_ENV === "development" &&
    user.email === process.env.E2E_TEST_EMAIL;
  if (isE2EUser) return supabaseResponse;

  // Verifica onboarding concluído (lido do JWT — sem roundtrip ao DB)
  const isOnboarded = user.user_metadata?.["onboarded"] === true;
  if (!isOnboarded && !isPublic) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // MFA (segundo fator) desativado por enquanto: login é só e-mail + senha.
  // Para religar, restaurar a verificação de aal2 aqui (TOTP via /mfa/enroll e /mfa/verify).

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
