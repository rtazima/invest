import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

// Rotas que não precisam de auth
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

// Rotas que precisam de auth mas não de aal2 (MFA em andamento)
const MFA_ROUTES = ["/mfa/enroll", "/mfa/verify"];

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

  // Renova sessão — não remover esta chamada
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isMfaRoute = MFA_ROUTES.some((r) => pathname.startsWith(r));

  // Não autenticado
  if (!user) {
    if (isPublic || isMfaRoute) return supabaseResponse;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticado + tentando acessar /login → redireciona
  if (pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rotas MFA: acessíveis com qualquer nível de auth
  if (isMfaRoute) return supabaseResponse;

  // Rotas protegidas: verifica se MFA está completo (aal2)
  if (!isPublic) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.currentLevel !== "aal2") {
      // Verifica se tem TOTP cadastrado
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasTOTP = (factors?.totp?.length ?? 0) > 0;

      if (!hasTOTP) {
        return NextResponse.redirect(new URL("/mfa/enroll", request.url));
      }
      return NextResponse.redirect(new URL("/mfa/verify", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
