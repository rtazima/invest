"use server";

import { revalidatePath } from "next/cache";
import { upsertStrategy, upsertAllocations, getStrategy } from "@/lib/data/strategies";
import type { Enums } from "@/types/database";

interface StrategyFormData {
  risk_profile: Enums<"risk_profile">;
  investment_horizon_years: number | null;
  goal_description: string | null;
  goal_monthly_income: number | null;
  goal_target_age: number | null;
  liquidity_min_pct: number;
  deviation_threshold_pct: number;
  notes: string | null;
}

export async function saveStrategyAction(holderId: string, data: StrategyFormData) {
  await upsertStrategy(holderId, {
    risk_profile: data.risk_profile,
    investment_horizon_years: data.investment_horizon_years,
    goal_description: data.goal_description,
    goal_monthly_income: data.goal_monthly_income,
    goal_target_age: data.goal_target_age,
    liquidity_min_pct: data.liquidity_min_pct,
    deviation_threshold_pct: data.deviation_threshold_pct,
    restricted_assets: null,
    notes: data.notes,
  });
  revalidatePath(`/holders/${holderId}/strategy`);
  revalidatePath("/holders");
}

export async function saveAllocationsAction(
  holderId: string,
  allocations: Array<{
    asset_class: string;
    target_pct: string;
    tolerance_pct: string;
  }>,
) {
  const strategy = await getStrategy(holderId);
  if (!strategy) throw new Error("Estratégia não encontrada. Salve o perfil primeiro.");

  await upsertAllocations(
    strategy.id,
    allocations.map((a) => ({
      asset_class: a.asset_class as Enums<"asset_class">,
      target_pct: parseFloat(a.target_pct),
      tolerance_pct: parseFloat(a.tolerance_pct),
      rationale: null,
    })),
  );

  revalidatePath(`/holders/${holderId}/strategy`);
  revalidatePath("/dashboard");
}
