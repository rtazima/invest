import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHolder } from "@/lib/data/holders";
import { getStrategy } from "@/lib/data/strategies";
import { getHolderSummary } from "@/lib/data/portfolio";
import { RiskProfileBadge } from "@/components/strategy/RiskProfileBadge";
import { StrategyPanel } from "@/components/strategy/StrategyPanel";
import { AllocationComparison, type AllocationTarget } from "@/components/strategy/AllocationComparison";

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
  const [holder, strategy, summary] = await Promise.all([
    getHolder(holderId),
    getStrategy(holderId),
    getHolderSummary(holderId),
  ]);

  const actualByClass: Record<string, number> = {};
  if (summary && summary.totalBrl.gt(0)) {
    for (const [cls, val] of Object.entries(summary.byAssetClass)) {
      actualByClass[cls] = val.div(summary.totalBrl).times(100).toNumber();
    }
  }
  const hasData = (summary?.totalBrl.gt(0)) ?? false;

  const allocationTargets: AllocationTarget[] = (strategy?.allocations ?? []).map((a) => ({
    asset_class: a.asset_class,
    target_pct: a.target_pct * 100,
    tolerance_pct: a.tolerance_pct * 100,
  }));

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

      {allocationTargets.length > 0 && (
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid var(--color-line-2)",
            backgroundColor: "var(--color-bg-2)",
            padding: "20px",
            marginTop: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>
            Alocação alvo vs. real
          </h2>
          <AllocationComparison
            targets={allocationTargets}
            actualByClass={actualByClass}
            hasData={hasData}
          />
        </div>
      )}
    </div>
  );
}
