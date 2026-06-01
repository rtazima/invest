import { getHolder } from "@/lib/data/holders";
import { getLatestPositions } from "@/lib/data/positions";
import { getStrategy } from "@/lib/data/strategies";
import { formatBRL } from "@/lib/decimal";
import Decimal from "decimal.js";

export async function buildCouncilContext(holderId: string): Promise<string> {
  const [holder, positions, strategy] = await Promise.all([
    getHolder(holderId),
    getLatestPositions(holderId),
    getStrategy(holderId),
  ]);

  const lines: string[] = [];

  lines.push(`Titular: ${holder?.name ?? "Investidor"}`);

  if (strategy) {
    lines.push(`Perfil de risco: ${strategy.risk_profile}`);
    if (strategy.investment_horizon_years)
      lines.push(`Horizonte: ${strategy.investment_horizon_years} anos`);
    if (strategy.goal_description)
      lines.push(`Objetivo: ${strategy.goal_description}`);
    if (strategy.goal_monthly_income)
      lines.push(`Meta de renda passiva: R$ ${strategy.goal_monthly_income.toLocaleString("pt-BR")}/mês`);
    if (strategy.goal_target_age)
      lines.push(`Idade-alvo: ${strategy.goal_target_age} anos`);
    lines.push(`Liquidez mínima: ${(strategy.liquidity_min_pct * 100).toFixed(0)}%`);
    if (strategy.notes)
      lines.push(`Observações: ${strategy.notes}`);

    if (strategy.allocations.length > 0) {
      lines.push("Alocações-alvo:");
      for (const a of strategy.allocations) {
        lines.push(
          `  ${a.asset_class}: ${(a.target_pct * 100).toFixed(0)}% ±${(a.tolerance_pct * 100).toFixed(0)}%`,
        );
      }
    }
  }

  if (positions.length > 0) {
    const total = positions.reduce((s, p) => s.plus(p.marketValueBrl), new Decimal(0));
    lines.push(`\nPatrimônio total: ${formatBRL(total)}`);
    lines.push("Portfólio por classe de ativo:");

    const byClass = new Map<string, Decimal>();
    for (const p of positions) {
      byClass.set(p.asset_class, (byClass.get(p.asset_class) ?? new Decimal(0)).plus(p.marketValueBrl));
    }

    for (const [cls, val] of [...byClass.entries()].sort((a, b) => b[1].cmp(a[1]))) {
      const pct = total.isZero() ? new Decimal(0) : val.div(total).times(100);
      lines.push(`  ${cls}: ${formatBRL(val)} (${pct.toFixed(1)}%)`);
    }

    lines.push("\nPosições principais:");
    const top = [...positions].sort((a, b) => b.marketValueBrl.cmp(a.marketValueBrl)).slice(0, 15);
    for (const p of top) {
      const ticker = p.ticker ? ` (${p.ticker})` : "";
      lines.push(`  ${p.name}${ticker}: ${formatBRL(p.marketValueBrl)} — ${p.asset_class}`);
    }
  }

  return lines.join("\n");
}
