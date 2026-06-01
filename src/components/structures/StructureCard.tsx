import Link from "next/link";
import type { StructureWithLegs } from "@/lib/data/structures";

interface Props {
  structure: StructureWithLegs;
  holderId: string;
}

const TYPE_LABELS: Record<string, string> = {
  covered_call: "Lançamento coberto",
  synthetic_dividend: "Dividendo sintético",
  collar: "Collar",
  protective_put: "Put de proteção",
};

const TYPE_COLORS: Record<string, string> = {
  covered_call: "oklch(0.65 0.15 200)",
  synthetic_dividend: "oklch(0.62 0.18 145)",
  collar: "oklch(0.62 0.14 50)",
  protective_put: "oklch(0.60 0.16 20)",
};

const ROLE_LABELS: Record<string, string> = {
  underlying: "Subjacente",
  short_call: "Call vendida",
  long_call: "Call comprada",
  short_put: "Put vendida",
  long_put: "Put comprada",
};

function daysToExpiry(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function StructureCard({ structure, holderId }: Props) {
  const color = TYPE_COLORS[structure.type] ?? "var(--color-text-2)";
  const days = structure.nearestExpiry ? daysToExpiry(structure.nearestExpiry) : null;
  const expiryBadge =
    days !== null
      ? days < 0
        ? { label: "Vencida", color: "var(--color-crit)" }
        : days <= 30
        ? { label: `Vence em ${days}d`, color: "var(--color-warn)" }
        : { label: `${days}d`, color: "var(--color-text-3)" }
      : null;

  return (
    <Link href={`/holders/${holderId}/structures/${structure.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg-2)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>{structure.name}</span>
            <span className="pill" style={{ color, borderColor: color, fontSize: "10.5px" }}>
              {TYPE_LABELS[structure.type] ?? structure.type}
            </span>
            {structure.status !== "active" && (
              <span className="pill" style={{ color: "var(--color-text-3)", fontSize: "10.5px" }}>
                {structure.status === "expired" ? "Expirada" : "Encerrada"}
              </span>
            )}
          </div>
          {expiryBadge && (
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: expiryBadge.color, whiteSpace: "nowrap" }}>
              {expiryBadge.label}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {structure.legs.map((leg) => (
            <div
              key={leg.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "5px",
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-bg-3)",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "var(--color-text-3)" }}>{ROLE_LABELS[leg.role] ?? leg.role}</span>
              {leg.ticker && <span className="num" style={{ fontWeight: 600 }}>{leg.ticker}</span>}
              {leg.strike && <span className="num" style={{ color: "var(--color-text-2)" }}>strike {leg.strike}</span>}
              {leg.expiration_date && (
                <span style={{ color: "var(--color-text-3)" }}>
                  {new Date(leg.expiration_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
          ))}
        </div>

        {structure.premiumTotal !== 0 && (
          <div style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>
            Prêmio total:{" "}
            <span
              className="num"
              style={{ fontWeight: 600, color: structure.premiumTotal > 0 ? "var(--color-gain)" : "var(--color-crit)" }}
            >
              {structure.premiumTotal > 0 ? "+" : ""}
              {structure.premiumTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
