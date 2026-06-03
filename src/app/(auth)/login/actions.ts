"use server";

import { cookies } from "next/headers";

export async function setAuthRedirectCookie(nextPath: string): Promise<void> {
  if (!nextPath.startsWith("/")) return;
  (await cookies()).set("auth_redirect", nextPath, {
    // não httpOnly: o client component em /auth/callback precisa ler via document.cookie
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });
}
