const LABELS: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Arrojado",
};

const COLORS: Record<string, string> = {
  conservative: "var(--color-info)",
  moderate: "var(--color-warn)",
  aggressive: "var(--color-gain)",
};

interface Props {
  profile: string;
}

export function RiskProfileBadge({ profile }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        color: COLORS[profile] ?? "var(--color-text-2)",
        border: `1px solid ${COLORS[profile] ?? "var(--color-line)"}`,
        backgroundColor: `color-mix(in oklch, ${COLORS[profile] ?? "transparent"} 12%, transparent)`,
      }}
    >
      {LABELS[profile] ?? profile}
    </span>
  );
}
