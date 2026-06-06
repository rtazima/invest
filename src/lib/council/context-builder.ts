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

    const domestic = positions.filter((p) => p.currency === "BRL");
    const international = positions.filter((p) => p.currency === "USD");

    const totalDom = domestic.reduce((s, p) => s.plus(p.marketValueBrl), new Decimal(0));
    const totalIntl = international.reduce((s, p) => s.plus(p.marketValueBrl), new Decimal(0));

    lines.push(`\nPatrimônio total: ${formatBRL(total)}`);
    lines.push(`  Doméstico (BRL): ${formatBRL(totalDom)} (${total.isZero() ? "0" : totalDom.div(total).times(100).toFixed(1)}%)`);
    lines.push(`  Internacional (USD): ${formatBRL(totalIntl)} (${total.isZero() ? "0" : totalIntl.div(total).times(100).toFixed(1)}%)`);

    // Alocação por classe de ativo (portfólio total)
    lines.push("\nAlocação atual por classe:");
    const byClass = new Map<string, Decimal>();
    for (const p of positions) {
      byClass.set(p.asset_class, (byClass.get(p.asset_class) ?? new Decimal(0)).plus(p.marketValueBrl));
    }
    for (const [cls, val] of [...byClass.entries()].sort((a, b) => b[1].cmp(a[1]))) {
      const pct = total.isZero() ? new Decimal(0) : val.div(total).times(100);
      lines.push(`  ${cls}: ${formatBRL(val)} (${pct.toFixed(1)}%)`);
    }

    // Carteira doméstica — todos os ativos
    if (domestic.length > 0) {
      lines.push("\nCarteira doméstica (BRL) — todas as posições:");
      const sortedDom = [...domestic].sort((a, b) => b.marketValueBrl.cmp(a.marketValueBrl));
      for (const p of sortedDom) {
        const ticker = p.ticker ? ` (${p.ticker})` : "";
        const pnlStr = p.pnlPctDecimal !== null
          ? ` P&L ${p.pnlPctDecimal.times(100).toFixed(1)}%`
          : "";
        const pct = total.isZero() ? "0" : p.marketValueBrl.div(total).times(100).toFixed(1);
        lines.push(`  ${p.name}${ticker}: ${formatBRL(p.marketValueBrl)} (${pct}% portfólio) — ${p.asset_class}${pnlStr}`);
      }
    }

    // Carteira internacional — lista completa sempre
    if (international.length > 0) {
      const exchangeRate = international.find((p) => p.exchange_rate)?.exchange_rate ?? null;
      const rateNote = exchangeRate ? ` (câmbio R$ ${Number(exchangeRate).toFixed(2)})` : "";
      lines.push(`\nCarteira internacional (USD)${rateNote} — todas as posições:`);

      const sortedIntl = [...international].sort((a, b) => b.marketValueBrl.cmp(a.marketValueBrl));
      for (const p of sortedIntl) {
        const ticker = p.ticker ? ` (${p.ticker})` : "";
        const usdValue = p.exchange_rate && Number(p.exchange_rate) > 0
          ? ` = USD ${(p.marketValueBrl.toNumber() / Number(p.exchange_rate)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : "";
        const pnlStr = p.pnlPctDecimal !== null
          ? ` P&L ${p.pnlPctDecimal.times(100).toFixed(1)}%`
          : "";
        const pctIntl = totalIntl.isZero() ? "0" : p.marketValueBrl.div(totalIntl).times(100).toFixed(1);
        const pctTotal = total.isZero() ? "0" : p.marketValueBrl.div(total).times(100).toFixed(1);
        lines.push(
          `  ${p.name}${ticker}: ${formatBRL(p.marketValueBrl)}${usdValue} | ${pctIntl}% intl | ${pctTotal}% portfólio | ${p.asset_class}${pnlStr} | ${p.institution.toUpperCase()}`,
        );
      }

      // Alocação por classe dentro do internacional
      lines.push("\nAlocação internacional por classe:");
      const byClassIntl = new Map<string, Decimal>();
      for (const p of international) {
        byClassIntl.set(p.asset_class, (byClassIntl.get(p.asset_class) ?? new Decimal(0)).plus(p.marketValueBrl));
      }
      for (const [cls, val] of [...byClassIntl.entries()].sort((a, b) => b[1].cmp(a[1]))) {
        const pct = totalIntl.isZero() ? new Decimal(0) : val.div(totalIntl).times(100);
        lines.push(`  ${cls}: ${formatBRL(val)} (${pct.toFixed(1)}% do internacional)`);
      }
    }
  }

  return lines.join("\n");
}
