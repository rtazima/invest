"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Alertas",
    icon: null,
    badge: true,
  },
  {
    href: "/holders",
    label: "Estratégia",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="7" />
        <circle cx="8" cy="8" r="4" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/import",
    label: "Importar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2v9M4 8l4 4 4-4" />
        <path d="M2 13h12" />
      </svg>
    ),
  },
] as const;

const BELL_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 1a5 5 0 0 1 5 5v2.5l1 2H2l1-2V6a5 5 0 0 1 5-5Z" />
    <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
  </svg>
);

interface Props {
  unreadCount: number;
}

export function Sidebar({ unreadCount }: Props) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        position: "fixed",
        inset: "0 auto 0 0",
        width: "56px",
        borderRight: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0.75rem 0",
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          backgroundColor: "var(--color-text)",
          color: "var(--color-bg)",
          display: "grid",
          placeItems: "center",
          fontWeight: 600,
          fontSize: "14px",
          marginBottom: "16px",
          textDecoration: "none",
        }}
        title="Invest"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="1,11 5,7 8,9 13,3" />
        </svg>
      </Link>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                position: "relative",
                width: "36px",
                height: "36px",
                display: "grid",
                placeItems: "center",
                borderRadius: "6px",
                backgroundColor: active ? "var(--color-bg-3)" : "transparent",
                color: active ? "var(--color-text)" : "var(--color-text-3)",
                textDecoration: "none",
                transition: "background-color 0.1s, color 0.1s",
              }}
            >
              {"badge" in item ? BELL_ICON : item.icon}
              {"badge" in item && unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-crit)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Avatar */}
      <div
        title="Rodrigo Tazima"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.45 0 0), oklch(0.30 0 0))",
          display: "grid",
          placeItems: "center",
          fontSize: "10.5px",
          fontWeight: 600,
          color: "var(--color-text)",
          outline: "1px solid var(--color-line)",
        }}
      >
        RT
      </div>
    </aside>
  );
}
