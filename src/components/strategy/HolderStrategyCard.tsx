"use client";

import Link from "next/link";

interface Props {
  href: string;
  children: React.ReactNode;
}

export function HolderStrategyCard({ href, children }: Props) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          transition: "background-color 0.1s, border-color 0.1s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-2)";
        }}
      >
        {children}
      </div>
    </Link>
  );
}
