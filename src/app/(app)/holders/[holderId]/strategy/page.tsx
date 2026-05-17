import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { getStrategy } from "@/lib/data/strategies";
import { RiskProfileBadge } from "@/components/strategy/RiskProfileBadge";
import { StrategyPanel } from "@/components/strategy/StrategyPanel";

interface Props {
  params: Promise<{ holderId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { holderId } = await params;
  const holder = await getHolder(holderId);
  return { title: holder ? `Estratégia — ${holder.name}` : "Estratégia" };
}

export default async function StrategyPage({ params }: Props) {
  const { holderId } = await params;
  const [holder, strategy] = await Promise.all([getHolder(holderId), getStrategy(holderId)]);

  if (!holder) notFound();

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/holders"
          style={{ fontSize: "12.5px", color: "var(--color-text-3)", textDecoration: "none" }}
        >
          ← Todos os titulares
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text)" }}>
            {holder.name}
          </h1>
          {strategy && <RiskProfileBadge profile={strategy.risk_profile} />}
        </div>
      </div>

      <StrategyPanel holder={holder} strategy={strategy} />
    </div>
  );
}
