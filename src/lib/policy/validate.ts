// Motor determinístico de política de investimento (P0 da revisão).
// Puro e testável: dado uma política e ou (a) uma alocação proposta ou (b) o
// estado atual da carteira, devolve as violações. Nenhuma sugestão da IA deve
// passar com violação crítica.
//
// Convenção de unidades: a política guarda frações (0..1, como no banco);
// alocações e estado de carteira são em PERCENTUAL (0..100).

export interface Policy {
  liquidity_min_pct: number | null; // fração 0..1
  restricted_assets: string[] | null;
  max_loss_pct: number | null; // fração 0..1 (perda máxima tolerada)
  max_single_asset_pct: number | null; // fração 0..1 (concentração máx por ativo)
}

export interface ProposedAllocation {
  asset_class: string;
  target_pct: number; // percentual 0..100
  tolerance_pct: number; // percentual 0..100
}

export interface AllocationBand {
  asset_class: string;
  target_pct: number; // percentual 0..100
  tolerance_pct: number; // percentual 0..100
}

export interface PortfolioState {
  byAssetClassPct: Record<string, number>; // % do total por classe
  holdings: Array<{ ticker: string | null; pct: number }>; // % do total por ativo
  liquidityPct: number; // % em liquidez
  unrealizedPnlPct: number | null; // % (ex -12 = caiu 12%)
}

export type ViolationKind =
  | "sum"
  | "liquidity"
  | "restricted"
  | "tolerance"
  | "band"
  | "concentration"
  | "max_loss";

export interface PolicyViolation {
  kind: ViolationKind;
  severity: "warning" | "critical";
  message: string;
  asset_class?: string;
  ticker?: string;
}

const EPS = 0.01;

// Valida uma alocação PROPOSTA (ex: sugestão da IA) contra a política.
export function validateProposedAllocations(policy: Policy, allocations: ProposedAllocation[]): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  const sum = allocations.reduce((s, a) => s + a.target_pct, 0);
  if (Math.abs(sum - 100) > 1) {
    violations.push({ kind: "sum", severity: "critical", message: `Alocações somam ${sum.toFixed(0)}%, deveriam somar 100%.` });
  }

  const floor = (policy.liquidity_min_pct ?? 0) * 100;
  const liqTarget = allocations.find((a) => a.asset_class === "liquidity")?.target_pct ?? 0;
  if (liqTarget < floor - EPS) {
    violations.push({
      kind: "liquidity",
      severity: "critical",
      message: `Liquidez proposta de ${liqTarget.toFixed(0)}% abaixo do mínimo de ${floor.toFixed(0)}%.`,
    });
  }

  const restricted = new Set((policy.restricted_assets ?? []).map((s) => s.toLowerCase()));
  for (const a of allocations) {
    if (a.target_pct > 0 && restricted.has(a.asset_class.toLowerCase())) {
      violations.push({
        kind: "restricted",
        severity: "critical",
        asset_class: a.asset_class,
        message: `Classe restrita ${a.asset_class} com ${a.target_pct.toFixed(0)}%.`,
      });
    }
    if (a.tolerance_pct < 0 || a.tolerance_pct > 15) {
      violations.push({
        kind: "tolerance",
        severity: "warning",
        asset_class: a.asset_class,
        message: `Tolerância de ${a.tolerance_pct}% em ${a.asset_class} fora do razoável (0-15%).`,
      });
    }
  }

  return violations;
}

// Valida o ESTADO ATUAL da carteira contra a política e as bandas. Reusável
// pela checagem de enquadramento e, depois, pela Fase 4 (testar uma proposta
// aplicada ao estado).
export function validatePortfolioState(
  policy: Policy,
  bands: AllocationBand[],
  state: PortfolioState,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const band of bands) {
    const actual = state.byAssetClassPct[band.asset_class] ?? 0;
    const dev = Math.abs(actual - band.target_pct);
    if (dev > band.tolerance_pct + EPS) {
      violations.push({
        kind: "band",
        severity: dev > band.tolerance_pct * 1.5 ? "critical" : "warning",
        asset_class: band.asset_class,
        message: `${band.asset_class}: ${actual.toFixed(1)}% vs alvo ${band.target_pct.toFixed(1)}% ±${band.tolerance_pct.toFixed(0)}%.`,
      });
    }
  }

  const floor = (policy.liquidity_min_pct ?? 0) * 100;
  if (state.liquidityPct < floor - EPS) {
    violations.push({
      kind: "liquidity",
      severity: "critical",
      message: `Liquidez de ${state.liquidityPct.toFixed(0)}% abaixo do mínimo de ${floor.toFixed(0)}%.`,
    });
  }

  const restricted = new Set((policy.restricted_assets ?? []).map((s) => s.toLowerCase()));
  if (restricted.size > 0) {
    for (const [cls, pct] of Object.entries(state.byAssetClassPct)) {
      if (pct > EPS && restricted.has(cls.toLowerCase())) {
        violations.push({
          kind: "restricted",
          severity: "warning",
          asset_class: cls,
          message: `Classe restrita ${cls} com ${pct.toFixed(1)}% na carteira.`,
        });
      }
    }
  }

  if (policy.max_single_asset_pct != null) {
    const cap = policy.max_single_asset_pct * 100;
    for (const h of state.holdings) {
      if (h.pct > cap + EPS) {
        violations.push({
          kind: "concentration",
          severity: h.pct > cap * 1.5 ? "critical" : "warning",
          ticker: h.ticker ?? undefined,
          message: `${h.ticker ?? "Ativo"} concentra ${h.pct.toFixed(1)}%, acima do limite de ${cap.toFixed(0)}%.`,
        });
      }
    }
  }

  if (policy.max_loss_pct != null && state.unrealizedPnlPct != null) {
    const limit = -policy.max_loss_pct * 100;
    if (state.unrealizedPnlPct < limit - EPS) {
      violations.push({
        kind: "max_loss",
        severity: "critical",
        message: `Perda de ${state.unrealizedPnlPct.toFixed(1)}% abaixo da tolerância de ${limit.toFixed(0)}%.`,
      });
    }
  }

  return violations;
}
