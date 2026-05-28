# Runbook — Agentes de monitoramento

Três agentes autônomos rodam via cron na VM GCP (Amaia) e via API REST protegida por `AGENT_SECRET`.

---

## Endpoints

| Agente | Rota | Frequência | Modelo |
|---|---|---|---|
| strategy-check | `POST /api/agents/strategy-check` | 2×/dia (8h e 18h) | Supabase direto |
| news-monitoring | `POST /api/agents/news-monitoring` | 2×/dia (8h e 18h) | Claude Haiku |
| fundamental-analysis | `POST /api/agents/fundamental-analysis` | 1×/mês | Claude Opus 4.7 |

Todos têm `maxDuration = 300` (segundos). Header obrigatório: `x-agent-secret: $AGENT_SECRET`.

---

## Acionar manualmente

```bash
SECRET="<valor do AGENT_SECRET no Vercel>"
BASE="https://project-cfwnl.vercel.app"

curl -s -X POST "$BASE/api/agents/strategy-check" \
  -H "x-agent-secret: $SECRET" --max-time 120

curl -s -X POST "$BASE/api/agents/news-monitoring" \
  -H "x-agent-secret: $SECRET" --max-time 120

curl -s -X POST "$BASE/api/agents/fundamental-analysis" \
  -H "x-agent-secret: $SECRET" --max-time 300
```

Resposta esperada: `{"analyzed": N, "created": M}` — onde `created` é o número de alertas novos.

---

## Cron na VM GCP (Amaia)

```
0 8,18 * * 1-5  curl -s -X POST https://project-cfwnl.vercel.app/api/agents/strategy-check  -H "x-agent-secret: $AGENT_SECRET"
0 8,18 * * 1-5  curl -s -X POST https://project-cfwnl.vercel.app/api/agents/news-monitoring   -H "x-agent-secret: $AGENT_SECRET"
0 1   1 * *     curl -s -X POST https://project-cfwnl.vercel.app/api/agents/fundamental-analysis -H "x-agent-secret: $AGENT_SECRET"
```

Para editar: `crontab -e` na Amaia. O `$AGENT_SECRET` deve estar no ambiente ou hardcoded no crontab.

---

## O que cada agente faz

### strategy-check
- Lê último batch importado de cada titular
- Compara alocação real vs. alvo (por classe de ativo) usando `allocation_rules` da estratégia
- Cria alerta `warning` se desvio > threshold configurado
- Janela de deduplicação: 48h

### news-monitoring
- Filtra posições de renda variável (stocks_br, stocks_intl, fiis, etf_br, etf_intl)
- Busca 5 notícias por ticker via Brave Search (`freshness=pd`, último dia)
- Claude Haiku avalia relevância e retorna `{relevant: bool, severity, summary}` — alerta criado se `relevant=true` e `summary` não vazio
- Janela de deduplicação: 24h

### fundamental-analysis
- Top 10 tickers por valor de mercado agregado na família
- Stocks BR/intl/ETF: dados do Fundamentus (P/L, P/VP, DY, EV/EBITDA, margens, ROE)
- FIIs: dados do Status Invest (P/VP, DY 12m, vacância física/financeira, val. patrimonial)
- Brave Search para notícias qualitativas (5 resultados, `freshness=pm`, último mês)
- Claude Opus 4.7 analisa e devolve `{verdict, severity, qualitative, quantitative, valuation, summary}`
- Description inclui `"NomeTitular · R$ valor"` da posição e link de gráfico como `sources[0]`
- Janela de deduplicação: 25 dias (600h)

---

## Deduplicação de alertas

`createAlertDeduped()` bloqueia inserção se já existe alerta com mesmo `(generated_by, title, holder_id, ticker)` dentro da janela. Para forçar re-execução com alertas novos, apague os existentes:

```sql
DELETE FROM alerts WHERE generated_by = 'fundamental-analysis';
-- ou
DELETE FROM alerts WHERE generated_by = 'news-monitoring' AND generated_at > now() - interval '24h';
```

---

## Mutes (silenciar alertas)

Alertas podem ser silenciados por ticker, por tipo ou globalmente via UI em `/alerts`. Mutes persistem na tabela `alert_mutes`. A contagem do badge e o dashboard filtram mutes — alertas mutados não aparecem mesmo que existam no banco.

---

## Debug de falhas

| Sintoma | Investigar |
|---|---|
| `{"error":"Unauthorized"}` | `AGENT_SECRET` no Vercel diferente do usado no curl |
| `504 Gateway Timeout` | Muitos tickers? Limite TOP_N em `fundamental.ts`. Verificar `maxDuration`. |
| `{"analyzed":N,"created":0}` | Todos os alertas dentro da janela de dedup — normal após primeira rodada |
| Scraper retorna `null` | Site mudou HTML. Testar `fetchFundamentus("PETR4")` localmente. |
| Brave retorna `[]` | Cota da API esgotada ou `BRAVE_API_KEY` inválida |

Logs em tempo real: Vercel dashboard → projeto invest → Functions → filtrar por rota.
