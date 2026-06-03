"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AuditBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "page_view", resource: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // never block navigation
    }
  }, [pathname]);

  return null;
}
