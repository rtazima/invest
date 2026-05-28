# ANR-008 — Sistema de alertas: arquitetura em três fases

**Status:** aprovado  
**Data:** 2026-05-28  
**Autor:** Rodrigo Tazima

---

## Decisão

Sistema de alertas em três camadas independentes, cada uma com fonte de dados, modelo e cadência próprios. Alertas persistidos no Supabase com deduplicação por janela de tempo e sistema de mutes por ticker/tipo.

---

## Contexto

Precisávamos de alertas acionáveis que cobrissem três horizontes diferentes: desvio de estratégia (diário), notícias relevantes (diário) e análise fundamentalista profunda (mensal). Uma única abordagem não serve para os três — cada camada tem latência, custo e profundidade diferentes.

---

## Arquitetura

### Fase 1 — Strategy Check (strategy.ts)

Sem Claude. Cálculo determinístico: compara alocação real (soma de `market_value_brl` por classe) vs. alvo (`allocation_rules` da estratégia do titular). Gera alerta por desvio. Roda 2×/dia.

### Fase 2 — News Monitoring (news.ts)

Claude Haiku como filtro de relevância. Brave Search busca notícias recentes por ticker. Haiku classifica score 0–10. Alerta criado se score ≥ 7. Barato o suficiente para rodar 2×/dia em toda a carteira.

### Fase 3 — Fundamental Analysis (fundamental.ts)

Claude Opus 4.7 para análise profunda. Dados quantitativos reais via scraping direto de Fundamentus (ações) e Status Invest (FIIs). Brave Search para contexto qualitativo. Roda mensalmente nos top 10 tickers por valor.

---

## Por que scraping direto em vez de API financeira

Fundamentus e Status Invest não oferecem API pública gratuita com os indicadores necessários. As alternativas pagas (Economatica, Refinitiv) custam R$2–10k/mês. O scraping com regex sobre HTML é frágil mas suficiente: se o site mudar layout, o campo retorna `null` e o prompt recebe "N/D" — não quebra o agente.

---

## Por que Brave Search em vez de NewsAPI ou scraping direto de portais

Brave tem API de busca com `freshness` por período (pd=dia, pm=mês), sem restrições por domínio, e retorna snippets suficientes para análise sem precisar abrir cada URL. NewsAPI tem paywall no plano gratuito para notícias BR.

---

## Deduplicação

`createAlertDeduped()` usa tupla `(generated_by, title, holder_id, ticker)` com janela de tempo. Evita que a mesma análise reapareça no feed antes de um ciclo completo. Janelas: 48h (estratégia), 24h (notícias), 600h/25 dias (fundamentalista).

---

## Mutes

Tabela `alert_mutes` com colunas `ticker` e `alert_type` (ambas nullable). Match parcial: ticker null = qualquer ticker, alert_type null = qualquer tipo. `countUnreadAlerts()` e `getAlerts()` aplicam o mesmo filtro de mutes — sem discrepância entre badge e lista.

---

## Limites operacionais

- Fundamental analysis: top 10 tickers por valor agregado para caber em 300s (Vercel limit)
- news-monitoring: todos os tickers de renda variável do portfólio, sem limite
- strategy-check: todos os titulares e todas as classes, sem limite

---

## Consequências

- Scrapers precisam de manutenção quando Fundamentus ou Status Invest mudam HTML
- Brave API tem cota mensal — monitorar uso se o portfólio crescer muito
- Claude Opus por ticker é caro se usado em frequência alta — manter mensal
- Sistema de mutes pode esconder problemas reais se o usuário silenciar por ticker genérico
