"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SEVERITIES = [
  { value: "", label: "Todos" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "unread", label: "Não lidos" },
  { value: "read", label: "Lidos" },
];

export function AlertFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/alerts?${next.toString()}`);
  }

  const selectStyle: React.CSSProperties = {
    fontSize: "12.5px",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid var(--color-line)",
    backgroundColor: "var(--color-bg-2)",
    color: "var(--color-text-2)",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <select
        value={params.get("severity") ?? ""}
        onChange={(e) => update("severity", e.target.value)}
        style={selectStyle}
      >
        {SEVERITIES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={params.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        style={selectStyle}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
