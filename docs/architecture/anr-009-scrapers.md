# ANR-009 — Scrapers de dados fundamentalistas

**Status:** aprovado  
**Data:** 2026-05-28  
**Autor:** Rodrigo Tazima

---

## Decisão

Scraping direto de Fundamentus (ações BR) e Status Invest (FIIs) via regex sobre HTML, com decode ISO-8859-1 para Fundamentus. Sem headless browser — fetch nativo com User-Agent de browser real.

---

## Contexto

O agente de análise fundamentalista precisa de indicadores quantitativos reais (P/L, P/VP, DY, margens, vacância) para dar contexto ao Claude Opus. Sem esses dados, o modelo opera apenas com notícias e produz análise superficial.

---

## Fundamentus (src/lib/scraper/fundamentus.ts)

- URL: `https://fundamentus.com.br/detalhes.php?papel=TICKER`
- Encoding: ISO-8859-1 — precisa de `new TextDecoder("iso-8859-1").decode(buf)` via `arrayBuffer()`
- Padrão HTML: `<span class="txt">LABEL</span></td><td class="data..."><span class="txt">VALUE</span>`
- Indicadores extraídos: P/L, P/VP, Div. Yield, EV/EBITDA, Marg. Bruta, Marg. EBIT, Marg. Líquida, ROE, Dív Líq/Patrim

## Status Invest — FIIs (src/lib/scraper/statusinvest.ts)

- URL: `https://statusinvest.com.br/fundos-imobiliarios/TICKER` (lowercase)
- Encoding: UTF-8
- Padrões HTML:
  - Indicadores principais: `<h3 class="title">LABEL</h3>...<strong class="value">VALUE</strong>`
  - Vacância: `<span class="sub-value">LABEL</span>...<strong class="value">VALUE</strong>`
  - Último rendimento: seção `<div id="dy-info">...<strong class="value">VALUE</strong>`
- Indicadores extraídos: P/VP, DY 12m, Val. patrimonial/cota, Último rendimento, Vacância física, Inadimplência

---

## Por que regex e não cheerio/puppeteer

- `cheerio`: adiciona ~300KB ao bundle, requer parse completo do DOM para busca simples
- `puppeteer`: precisa de Chrome headless, incompatível com Vercel Serverless
- Regex sobre string HTML: zero dependências, funciona em Edge runtime se necessário
- Risco: regex quebra se o site muda estrutura. Mitigado: campo retorna `null` e o prompt recebe "N/D" — o agente continua funcionando

---

## URLs de gráfico geradas

```
FIIs:       https://statusinvest.com.br/fundos-imobiliarios/{ticker}
Stocks BR:  https://statusinvest.com.br/acoes/{ticker}
ETF BR:     https://statusinvest.com.br/etfs/{ticker}
Intl:       https://finance.yahoo.com/chart/{TICKER}
```

Essas URLs vão como `sources[0]` nos alertas fundamentalistas e são exibidas como "Ver gráfico" no AlertCard.

---

## Manutenção

Se o scraper começar a retornar todos os campos como `null`, verificar:
1. Fundamentus: inspecionar HTML de `https://fundamentus.com.br/detalhes.php?papel=PETR4`, buscar o padrão `class="txt"` e `class="data"`
2. Status Invest: inspecionar HTML de `https://statusinvest.com.br/fundos-imobiliarios/knri11`, buscar `class="title"` e `class="value"`
3. Ambos podem ter mudado para classes dinâmicas (hash) após migração de framework

---

## Consequências

- Dependência implícita em HTML não versionado de terceiros
- Headers de browser real necessários para evitar bloqueio por bot detection
- Sem autenticação — campos de usuário logado não acessíveis (fundos detalhados no Status Invest)
- Se Fundamentus migrar para SPA (React/Vue), fetch estático para de funcionar e precisará de puppeteer
