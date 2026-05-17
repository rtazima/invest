import { Metadata } from "next";
import Link from "next/link";
import { getHolders } from "@/lib/data/holders";
import { getStrategy } from "@/lib/data/strategies";
import { RiskProfileBadge } from "@/components/strategy/RiskProfileBadge";

export const metadata: Metadata = { title: "Estratégia — Invest" };

const HOLDER_COLORS: Record<string, string> = {
  rodrigo: "oklch(0.65 0.10 240)",
  grasi: "oklch(0.68 0.13 330)",
  amora: "oklch(0.72 0.15 60)",
  benicio: "oklch(0.70 0.13 160)",
};

export default async function HoldersPage() {
  const holders = await getHolders();

  const strategiesData = await Promise.all(
    holders.map(async (h) => ({ holderId: h.id, strategy: await getStrategy(h.id) })),
  );
  const strategyMap = new Map(strategiesData.map((s) => [s.holderId, s.strategy]));

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
          Estratégia por titular
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-3)" }}>
          Perfil de risco, objetivos e alocação-alvo de cada membro da família.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {holders.map((h) => {
          const strategy = strategyMap.get(h.id);
          const color = HOLDER_COLORS[h.slug] ?? "var(--color-brand)";

          return (
            <Link
              key={h.id}
              href={`/holders/${h.id}/strategy`}
              style={{ textDecoration: "none" }}
            >
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
                {/* Avatar */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: color,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-bg)",
                    flexShrink: 0,
                  }}
                >
                  {h.name[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text)" }}>
                      {h.name}
                    </span>
                    {h.is_minor && (
                      <span className="pill" style={{ fontSize: "10px" }}>menor</span>
                    )}
                    {strategy && <RiskProfileBadge profile={strategy.risk_profile} />}
                  </div>
                  {strategy?.goal_description ? (
                    <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-text-3)" }}>
                      {strategy.goal_description}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-text-3)" }}>
                      {strategy ? `${strategy.allocations.length} classe${strategy.allocations.length !== 1 ? "s" : ""} configurada${strategy.allocations.length !== 1 ? "s" : ""}` : "Estratégia não configurada"}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
