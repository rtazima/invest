const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

export interface StatusInvestFiiData {
  ticker: string;
  pvp: number | null;
  dy12m: number | null;
  ultimoRendimento: number | null;
  vacanciaFisica: number | null;
  vacanciaFinanceira: number | null;
  valPatrimonialCota: number | null;
}

function parseBR(s: string): number | null {
  const clean = s.trim().replace(/[%\sR$]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// Extrai valor de um <h3 class="title">LABEL</h3> seguido de <strong class="value">VALUE</strong>
function extractByTitle(html: string, label: string): number | null {
  const esc = label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(
    `<h3[^>]*class="[^"]*title[^"]*"[^>]*>\\s*${esc}\\s*<\\/h3>[\\s\\S]{0,200}?<strong[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)<`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] ? parseBR(m[1]) : null;
}

// Extrai vacância — o valor está num <strong class="value"> após <span class="sub-value">LABEL</span>
function extractVacancy(html: string, label: string): number | null {
  const esc = label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(
    `<span[^>]*class="sub-value"[^>]*>\\s*${esc}\\s*<\\/span>[\\s\\S]{0,300}?<strong[^>]*class="[^"]*value[^"]*"[^>]*>([^<%-]+)`,
    "i",
  );
  const m = html.match(re);
  if (!m?.[1]) return null;
  const val = m[1].trim();
  if (val === "-" || val === "") return null;
  return parseBR(val);
}

// Extrai o último rendimento do div#dy-info
function extractLastDividend(html: string): number | null {
  const dySection = html.match(/<div[^>]*id="dy-info"[^>]*>([\s\S]{0,800}?)<\/div>/i);
  if (!dySection?.[1]) return null;
  const m = dySection[1].match(/<strong[^>]*class="[^"]*value[^"]*"[^>]*>([^<]+)</);
  return m?.[1] ? parseBR(m[1]) : null;
}

export async function fetchStatusInvestFii(ticker: string): Promise<StatusInvestFiiData | null> {
  try {
    const url = `https://statusinvest.com.br/fundos-imobiliarios/${ticker.toLowerCase()}`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const html = await res.text();
    if (html.includes("página não encontrada") || html.includes("404")) return null;

    return {
      ticker: ticker.toUpperCase(),
      pvp: extractByTitle(html, "P/VP"),
      dy12m: extractByTitle(html, "Dividend Yield"),
      valPatrimonialCota: extractByTitle(html, "Val. patrimonial p/cota"),
      ultimoRendimento: extractLastDividend(html),
      vacanciaFisica: extractVacancy(html, "Vacância"),
      vacanciaFinanceira: extractVacancy(html, "Inadimplência"),
    };
  } catch {
    return null;
  }
}
