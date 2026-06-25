import { createServiceClient } from "@/lib/supabase/service";
import { createUntypedServiceClient } from "@/lib/supabase/untyped";
import { createAlertDeduped } from "@/lib/data/alerts";

// Fase 3: cruza o preço-alvo do research da família com a carteira e gera alerta
// quando o papel está esticado (acima do alvo) ou tem recomendação de venda.
// Preço-alvo só faz sentido para ações/ETF; FII e renda fixa usam outros sinais.

const VALID_DAYS = 120; // research mais antigo que isso não conta
const MIN_MV_BRL = 5000; // materialidade mínima da posição
const STRETCH = -0.05; // preço atual >5% acima do alvo = esticado
const STOCK_CLASSES = new Set(["stocks_br", "etf_br"]);

type Severity = "info" | "warning" | "critical";

interface ValidObs {
  house: string;
  target: number;
  currency: string | null;
  rating: string | null;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function houseLabel(houses: string[]): string {
  if (houses.length === 1) return `visão da ${houses[0]}`;
  if (houses.length === 2) return `${houses[0]} e ${houses[1]}`;
  return `consenso (${houses.length} casas)`;
}

function targetLabel(targets: number[], houses: string[]): string {
  const med = median(targets);
  if (houses.length >= 3) {
    return `mediana R$ ${med.toFixed(2)} (R$ ${Math.min(...targets).toFixed(2)}–${Math.max(...targets).toFixed(2)})`;
  }
  return `R$ ${med.toFixed(2)}`;
}

export async function runResearchTargetCheck(): Promise<{ checked: number; created: number }> {
  const db = createServiceClient();
  const research = createUntypedServiceClient();

  const { data: holders } = await db.from("holders").select("id, name, family_id");
  if (!holders || holders.length === 0) return { checked: 0, created: 0 };
  const holderById = new Map(holders.map((h) => [h.id, h]));

  // posições do lote mais recente por holder/instituição/arquivo (mesmo padrão do fundamental)
  const { data: batches } = await db
    .from("import_batches")
    .select("id, holder_id, institution, filename")
    .eq("status", "completed")
    .in("holder_id", holders.map((h) => h.id))
    .order("completed_at", { ascending: false });

  const latestBatchId = new Map<string, string>();
  for (const b of batches ?? []) {
    const key = `${b.holder_id}:${b.institution}:${b.filename ?? ""}`;
    if (!latestBatchId.has(key)) latestBatchId.set(key, b.id);
  }
  const batchIds = Array.from(latestBatchId.values());
  if (batchIds.length === 0) return { checked: 0, created: 0 };

  const { data: positions } = await db
    .from("positions")
    .select("holder_id, ticker, asset_class, currency, current_price, market_value_brl")
    .in("batch_id", batchIds)
    .not("ticker", "is", null);

  // observações de research com preço-alvo (untyped)
  const { data: obsData } = await research
    .from("research_observations")
    .select("family_id, report_id, ticker, target_price, currency, rating_canonical")
    .not("target_price", "is", null);
  const obs = (obsData as Array<{
    family_id: string;
    report_id: string;
    ticker: string | null;
    target_price: number | null;
    currency: string | null;
    rating_canonical: string | null;
  }> | null) ?? [];
  if (obs.length === 0) return { checked: 0, created: 0 };

  const reportIds = Array.from(new Set(obs.map((o) => o.report_id)));
  const { data: repData } = await research
    .from("research_reports")
    .select("id, house, report_date")
    .in("id", reportIds);
  const repById = new Map(
    ((repData as Array<{ id: string; house: string; report_date: string | null }> | null) ?? []).map((r) => [r.id, r]),
  );

  // indexa observações válidas por família|ticker
  const cutoff = Date.now() - VALID_DAYS * 86_400_000;
  const obsByKey = new Map<string, ValidObs[]>();
  for (const o of obs) {
    const rep = repById.get(o.report_id);
    if (!rep || !rep.report_date) continue;
    if (new Date(rep.report_date).getTime() < cutoff) continue;
    if (typeof o.target_price !== "number") continue;
    const key = `${o.family_id}|${(o.ticker ?? "").toUpperCase()}`;
    const list = obsByKey.get(key) ?? [];
    list.push({ house: rep.house, target: o.target_price, currency: o.currency, rating: o.rating_canonical });
    obsByKey.set(key, list);
  }

  let checked = 0;
  let created = 0;

  for (const p of positions ?? []) {
    if (!STOCK_CLASSES.has(p.asset_class)) continue;
    if (p.current_price == null) continue;
    if ((p.market_value_brl ?? 0) < MIN_MV_BRL) continue;
    const holder = holderById.get(p.holder_id);
    if (!holder) continue;

    const key = `${holder.family_id}|${(p.ticker ?? "").toUpperCase()}`;
    const matches = obsByKey.get(key);
    if (!matches || matches.length === 0) continue;

    // moeda compatível (posição em BRL; aceita obs sem moeda ou BRL)
    const valid = matches.filter(
      (m) => !m.currency || m.currency.toUpperCase() === "BRL" || m.currency.toUpperCase() === p.currency,
    );
    if (valid.length === 0) continue;
    checked++;

    const targets = valid.map((m) => m.target);
    const houses = Array.from(new Set(valid.map((m) => m.house.toUpperCase())));
    const med = median(targets);
    const current = p.current_price;
    const upside = (med - current) / current;
    const mvStr = (p.market_value_brl ?? 0).toLocaleString("pt-BR");

    if (upside <= STRETCH) {
      const pct = Math.abs(upside * 100).toFixed(0);
      const severity: Severity = upside <= -0.15 ? "critical" : "warning";
      const ok = await createAlertDeduped(
        {
          holder_id: p.holder_id,
          ticker: p.ticker ?? undefined,
          severity,
          title: `${p.ticker} — acima do preço-alvo (${houseLabel(houses)})`,
          description: `Preço atual R$ ${current.toFixed(2)} está ${pct}% acima do alvo (${targetLabel(targets, houses)}). Posição de R$ ${mvStr}.`,
          recommendation: "Papel esticado vs o alvo das casas. Avalie reduzir ou realizar.",
          generated_by: "research-target",
        },
        7 * 24,
        db,
      );
      if (ok) created++;
    } else if (valid.some((m) => m.rating === "sell")) {
      const ok = await createAlertDeduped(
        {
          holder_id: p.holder_id,
          ticker: p.ticker ?? undefined,
          severity: "warning",
          title: `${p.ticker} — recomendação de venda (${houseLabel(houses)})`,
          description: `Há recomendação de venda no research (${houseLabel(houses)}). Preço atual R$ ${current.toFixed(2)}, alvo ${targetLabel(targets, houses)}. Posição de R$ ${mvStr}.`,
          recommendation: "A casa recomenda reduzir ou sair. Reveja a tese.",
          generated_by: "research-target",
        },
        7 * 24,
        db,
      );
      if (ok) created++;
    }
  }

  return { checked, created };
}
