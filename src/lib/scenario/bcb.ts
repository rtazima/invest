// Cliente das APIs públicas do Banco Central. Sem chave, sem auth.
// Focus: expectativas de mercado (Olinda OData).
// SGS: séries temporais (Selic meta, IPCA 12m, dólar PTAX).
//
// Os dois endpoints são gratuitos e abertos. Em caso de falha, o agente
// deve seguir com o que conseguiu — o snapshot é gravado junto do cenário.

const OLINDA_FOCUS =
  "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais";
const SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// Indicadores anuais do Focus que interessam ao cenário.
const FOCUS_INDICATORS = ["Selic", "IPCA", "Câmbio", "PIB Total", "IGP-M"] as const;
type FocusIndicator = (typeof FOCUS_INDICATORS)[number];

// Séries SGS: valor corrente de hoje.
const SGS_SERIES = {
  selic_meta: 432, // Meta Selic definida pelo Copom (% a.a.)
  ipca_12m: 13522, // IPCA acumulado em 12 meses (%)
  usd_brl: 1, // Dólar venda PTAX (R$)
} as const;

export interface FocusByYear {
  // mediana das projeções por ano de referência (ex: { "2026": 14, "2027": 12 })
  date: string | null; // data da rodada do Focus usada (ISO)
  byYear: Record<string, number>;
}

export interface SeriesPoint {
  value: number | null;
  date: string | null; // ISO (YYYY-MM-DD)
}

export interface MacroSnapshot {
  fetchedAt: string;
  focus: Record<FocusIndicator, FocusByYear>;
  series: {
    selic_meta: SeriesPoint;
    ipca_12m: SeriesPoint;
    usd_brl: SeriesPoint;
  };
}

async function getJson(url: string, timeoutMs = 12_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface FocusRow {
  Indicador: string;
  Data: string;
  DataReferencia: string;
  Mediana: number;
}

// Busca a rodada mais recente do Focus para um indicador e devolve a mediana
// por ano de referência (ano corrente e os próximos dois).
async function fetchFocusIndicator(indicador: FocusIndicator): Promise<FocusByYear> {
  const params = new URLSearchParams({
    $top: "60",
    $filter: `Indicador eq '${indicador}'`,
    $orderby: "Data desc",
    $select: "Indicador,Data,DataReferencia,Mediana",
    $format: "json",
  });
  try {
    const json = (await getJson(`${OLINDA_FOCUS}?${params.toString()}`)) as { value?: FocusRow[] };
    const rows = json.value ?? [];
    if (rows.length === 0) return { date: null, byYear: {} };

    // a rodada mais recente é o maior Data presente
    const latestDate = rows.reduce((max, r) => (r.Data > max ? r.Data : max), rows[0]!.Data);
    const currentYear = Number(latestDate.slice(0, 4));
    const wantedYears = [currentYear, currentYear + 1, currentYear + 2].map(String);

    const byYear: Record<string, number> = {};
    for (const r of rows) {
      if (r.Data !== latestDate) continue;
      if (wantedYears.includes(r.DataReferencia) && typeof r.Mediana === "number") {
        byYear[r.DataReferencia] = r.Mediana;
      }
    }
    return { date: latestDate, byYear };
  } catch {
    return { date: null, byYear: {} };
  }
}

interface SgsRow {
  data: string; // DD/MM/YYYY
  valor: string;
}

// "03/08/2026" -> "2026-08-03"
function sgsDateToIso(d: string): string | null {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

async function fetchSgsLast(code: number): Promise<SeriesPoint> {
  try {
    const json = (await getJson(`${SGS}.${code}/dados/ultimos/1?formato=json`)) as SgsRow[];
    const last = json.at(-1);
    if (!last) return { value: null, date: null };
    const v = Number(last.valor);
    return { value: Number.isFinite(v) ? v : null, date: sgsDateToIso(last.data) };
  } catch {
    return { value: null, date: null };
  }
}

export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const [selic, ipca, cambio, pib, igpm, selicMeta, ipca12m, usdBrl] = await Promise.all([
    fetchFocusIndicator("Selic"),
    fetchFocusIndicator("IPCA"),
    fetchFocusIndicator("Câmbio"),
    fetchFocusIndicator("PIB Total"),
    fetchFocusIndicator("IGP-M"),
    fetchSgsLast(SGS_SERIES.selic_meta),
    fetchSgsLast(SGS_SERIES.ipca_12m),
    fetchSgsLast(SGS_SERIES.usd_brl),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    focus: {
      Selic: selic,
      IPCA: ipca,
      Câmbio: cambio,
      "PIB Total": pib,
      "IGP-M": igpm,
    },
    series: { selic_meta: selicMeta, ipca_12m: ipca12m, usd_brl: usdBrl },
  };
}

// Formata o snapshot para o prompt do modelo, de forma legível.
export function snapshotToContext(s: MacroSnapshot): string {
  const lines: string[] = [];
  lines.push("DADOS CORRENTES (BCB, séries SGS):");
  lines.push(`- Meta Selic: ${s.series.selic_meta.value ?? "N/D"}% a.a.`);
  lines.push(`- IPCA acumulado 12m: ${s.series.ipca_12m.value ?? "N/D"}%`);
  lines.push(`- Dólar PTAX (venda): R$ ${s.series.usd_brl.value ?? "N/D"}`);
  lines.push("");
  lines.push("PROJEÇÕES DE MERCADO (Boletim Focus, mediana por ano):");
  for (const ind of FOCUS_INDICATORS) {
    const f = s.focus[ind];
    const years = Object.entries(f.byYear)
      .map(([y, v]) => `${y}: ${v}`)
      .join(" | ");
    lines.push(`- ${ind}${f.date ? ` (rodada ${f.date})` : ""}: ${years || "N/D"}`);
  }
  return lines.join("\n");
}

// Menor data (ISO) entre os inputs de cadência rápida do Brasil, para o frescor.
// Usamos a rodada semanal do Focus e o câmbio diário. Séries mensais (IPCA 12m)
// e a meta Selic (datada pela reunião do Copom) são naturalmente defasadas e não
// devem rebaixar o frescor do cenário, embora sigam entrando como input do modelo.
export function brOldestDate(s: MacroSnapshot): string | null {
  const dates = [s.series.usd_brl.date, s.focus.Selic.date]
    .filter((d): d is string => d !== null)
    .sort();
  return dates[0] ?? null;
}
