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
    const res = await fetch(url, { headers: HEADERS });
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
      evEbitda: extract(html, "EV/EBITDA"),
      margBruta: extract(html, "Marg. Bruta"),
      margEbit: extract(html, "Marg. EBIT"),
      margLiquida: extract(html, "Marg. Líquida"),
      roe: extract(html, "ROE"),
      divLiqPatrim: extract(html, "Dív Líq/Patrim"),
      receitaLiquida: extract(html, "Receita Líquida"),
      lucroLiquido: extract(html, "Lucro Líquido"),
    };
  } catch {
    return null;
  }
}
