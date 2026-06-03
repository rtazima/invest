"use server";

import { cookies } from "next/headers";

const SITE_URL = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export function getSiteUrl(): string {
  return SITE_URL;
}

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
