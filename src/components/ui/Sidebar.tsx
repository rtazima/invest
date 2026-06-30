"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
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
    badge: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 1a5 5 0 0 1 5 5v2.5l1 2H2l1-2V6a5 5 0 0 1 5-5Z" />
        <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
      </svg>
    ),
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
        <path d="M5 5h6M5 8h6M5 11h4" />
      </svg>
    ),
  },
  {
    href: "/holders",
    label: "Estratégia",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="7" />
        <circle cx="8" cy="8" r="4" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/analise",
    label: "Análise",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12V8M6 12V5M10 12V7M14 12V3" />
      </svg>
    ),
    children: [
      { href: "/analise/acoes", label: "Ações" },
      { href: "/analise/fiis", label: "FIIs" },
      { href: "/analise/parametros", label: "Parâmetros" },
    ],
  },
  {
    href: "/research",
    label: "Research",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 1.5h7l3 3V14a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
        <path d="M9.5 1.5V5h3.5M5 8h6M5 11h4" />
      </svg>
    ),
  },
  {
    href: "/positions",
    label: "Ativos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="3" width="14" height="10" rx="1.5" />
        <path d="M1 6h14" />
        <path d="M5 6v7" />
      </svg>
    ),
    children: [
      {
        href: "/transfers",
        label: "Transferências",
        transferBadge: true,
      },
    ],
  },
  {
    href: "/import",
    label: "Importar",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2v9M4 8l4 4 4-4" />
        <path d="M2 13h12" />
      </svg>
    ),
  },
  {
    href: "/familia",
    label: "Família",
    ownerOnly: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="5" r="2.5" />
        <path d="M1 13c0-2.761 2.239-4 5-4s5 1.239 5 4" />
        <circle cx="12" cy="5.5" r="2" />
        <path d="M12 9.5c1.657 0 3 .895 3 3" />
      </svg>
    ),
  },
  {
    href: "/admin/logs",
    label: "Logs",
    ownerOnly: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M2 8h8M2 12h5" />
      </svg>
    ),
  },
] as const;

interface Props {
  unreadCount: number;
  pendingTransfers: number;
  isOwner: boolean;
  userInitials: string;
  userName: string;
}

export function Sidebar({ unreadCount, pendingTransfers, isOwner, userInitials, userName }: Props) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !("ownerOnly" in item && item.ownerOnly) || isOwner,
  );

  return (
    <aside
      style={{
        position: "fixed",
        inset: "0 auto 0 0",
        width: "192px",
        borderRight: "1px solid var(--color-line-2)",
        backgroundColor: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        padding: "0.75rem 0.5rem",
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 8px",
          marginBottom: "16px",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            backgroundColor: "var(--color-text)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--color-bg)" strokeWidth="1.5">
            <polyline points="1,11 5,7 8,9 13,3" />
          </svg>
        </div>
        <span style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--color-text)", letterSpacing: "-0.01em" }}>
          Invest
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const hasChildren = "children" in item && item.children.length > 0;
          // Expand children when on the parent or any child route
          const expanded = hasChildren && (
            pathname.startsWith(item.href)
          );

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  backgroundColor: active && !expanded ? "var(--color-bg-3)" : expanded ? "var(--color-bg-3)" : "transparent",
                  color: active || expanded ? "var(--color-text)" : "var(--color-text-3)",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: active || expanded ? 500 : 400,
                  transition: "background-color 0.1s, color 0.1s",
                }}
              >
                {"icon" in item && item.icon}
                <span>{item.label}</span>
                {"badge" in item && item.badge && unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      minWidth: "16px",
                      height: "16px",
                      borderRadius: "999px",
                      backgroundColor: "var(--color-crit)",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: 600,
                      display: "grid",
                      placeItems: "center",
                      padding: "0 4px",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Sub-items */}
              {hasChildren && expanded && (
                <div style={{ marginTop: "2px", marginBottom: "2px" }}>
                  {item.children.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 10px 5px 34px",
                          borderRadius: "6px",
                          backgroundColor: childActive ? "var(--color-bg-3)" : "transparent",
                          color: childActive ? "var(--color-text)" : "var(--color-text-3)",
                          textDecoration: "none",
                          fontSize: "12.5px",
                          fontWeight: childActive ? 500 : 400,
                          transition: "background-color 0.1s, color 0.1s",
                          opacity: "muted" in child && child.muted ? 0.6 : 1,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                          <path d="M2 5h8M6 2l4 3-4 3" />
                          <path d="M10 7H2M5 4l-3 3 3 3" />
                        </svg>
                        <span>{child.label}</span>
                        {"transferBadge" in child && child.transferBadge && pendingTransfers > 0 && (
                          <span
                            style={{
                              marginLeft: "auto",
                              minWidth: "16px",
                              height: "16px",
                              borderRadius: "999px",
                              backgroundColor: "var(--color-warn)",
                              color: "var(--color-bg)",
                              fontSize: "10px",
                              fontWeight: 600,
                              display: "grid",
                              placeItems: "center",
                              padding: "0 4px",
                            }}
                          >
                            {pendingTransfers > 9 ? "9+" : pendingTransfers}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div
        style={{
          borderTop: "1px solid var(--color-line-2)",
          paddingTop: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, oklch(0.45 0 0), oklch(0.30 0 0))",
              display: "grid",
              placeItems: "center",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--color-text)",
              outline: "1px solid var(--color-line)",
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <span
            style={{
              fontSize: "12.5px",
              color: "var(--color-text-2)",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userName}
          </span>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "7px 10px",
              borderRadius: "6px",
              backgroundColor: "transparent",
              color: "var(--color-text-3)",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 400,
              textAlign: "left",
              transition: "background-color 0.1s, color 0.1s",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" />
              <path d="M10 11l4-4-4-4" />
              <path d="M14 8H6" />
            </svg>
            Sair
          </button>
        </form>

        <div
          style={{
            padding: "6px 10px 2px",
            fontSize: "10.5px",
            color: "var(--color-text-3)",
            letterSpacing: "0.01em",
            display: "flex",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>
            {process.env.NEXT_PUBLIC_APP_SHA}
          </span>
          <span style={{ color: "var(--color-line)" }}>·</span>
          <span>{process.env.NEXT_PUBLIC_BUILD_DATE}</span>
        </div>
      </div>
    </aside>
  );
}
