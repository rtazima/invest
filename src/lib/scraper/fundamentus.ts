const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

export interface FundamentusData {
  ticker: string;
  pl: number | null;
  pvp: number | null;
  dy: number | null;
  evEbitda: number | null;
  margBruta: number | null;
  margEbit: number | null;
  margLiquida: number | null;
  roe: number | null;
  divLiqPatrim: number | null;
  receitaLiquida: number | null;
  lucroLiquido: number | null;
  roic: number | null;
  crescRec5a: number | null;
  roa: number | null;
  liquidezCorr: number | null;
  // Valores absolutos para derivar métricas compostas no runner
  valorFirma: number | null;   // EV em R$
  divLiquida: number | null;   // Dívida líquida em R$
  ativo: number | null;        // Total de ativos em R$
}

// Converte número no formato BR ("1.234,56" ou "15,2%") para float
function parseBR(s: string): number | null {
  const clean = s.trim().replace(/[%\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// Extrai o valor de um indicador dado o rótulo exato como aparece na página
function extract(html: string, label: string): number | null {
  const esc = label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
  // Pattern: <span class="txt">LABEL</span></td><td class="data..."><span class="txt">VALUE</span>
  const re = new RegExp(
    `<span[^>]*class="txt"[^>]*>\\s*${esc}\\s*<\\/span>\\s*<\\/td>\\s*<td[^>]*class="[^"]*data[^"]*"[^>]*>\\s*<span[^>]*class="txt"[^>]*>([^<]+)<\\/span>`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] ? parseBR(m[1]) : null;
}

export async function fetchFundamentus(ticker: string): Promise<FundamentusData | null> {
  try {
    const url = `https://fundamentus.com.br/detalhes.php?papel=${ticker.toUpperCase()}`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    // Fundamentus usa ISO-8859-1
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("iso-8859-1").decode(buf);

    if (html.includes("Papel não encontrado")) return null;

    return {
      ticker: ticker.toUpperCase(),
      pl: extract(html, "P/L"),
      pvp: extract(html, "P/VP"),
      dy: extract(html, "Div. Yield"),
      evEbitda: extract(html, "EV / EBITDA"),      // label real tem espaços
      margBruta: extract(html, "Marg. Bruta"),
      margEbit: extract(html, "Marg. EBIT"),
      margLiquida: extract(html, "Marg. Líquida"),
      roe: extract(html, "ROE"),
      divLiqPatrim: extract(html, "Dív Líq / Patrim"),
      receitaLiquida: extract(html, "Receita Líquida"),
      lucroLiquido: extract(html, "Lucro Líquido"),
      roic: extract(html, "ROIC"),
      crescRec5a: extract(html, "Cres. Rec (5a)"),  // label real usa abreviação diferente
      roa: null,                                     // não existe como label no Fundamentus — calculado no runner
      liquidezCorr: extract(html, "Liquidez Corr"),
      valorFirma: extract(html, "Valor da firma"),   // EV absoluto para derivar DL/EBITDA
      divLiquida: extract(html, "Dív. Líquida"),     // dívida líquida absoluta
      ativo: extract(html, "Ativo"),                 // total de ativos para calcular ROA
    };
  } catch {
    return null;
  }
}
