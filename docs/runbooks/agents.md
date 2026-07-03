# Runbook — Agentes de monitoramento

Agentes autônomos rodam via cron na VM GCP (Amaia) e via API REST protegida por `AGENT_SECRET`.

---

## Endpoints

| Agente | Rota | Frequência | Modelo |
|---|---|---|---|
| strategy-check | `POST /api/agents/strategy-check` | diário 7h BRT | Supabase direto |
| news-monitoring | `POST /api/agents/news-monitoring` | diário 8h BRT | Claude Haiku |
| fundamental-analysis | `POST /api/agents/fundamental-analysis` | dia 1 do mês, 9h BRT | Claude Opus 4.7 |
| macro-scenario | `POST /api/agents/macro-scenario` | segundas 9h BRT (após Focus) | Claude Opus 4.7 |
| research-target-check | `POST /api/agents/research-target-check` | dias úteis 19h30 BRT | Supabase direto |
| weekly-report | `POST /api/agents/weekly-report` | segundas 9h30 BRT (após cenário) | Claude Opus 4.7 |

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

Horários em UTC (BRT = UTC−3). Secret hardcoded no crontab. Log em `/home/tazima/amaia-agent/data/invest-agents.log`.

```
0 10  * * *    curl -s -X POST .../api/agents/strategy-check         -H "x-agent-secret: $AGENT_SECRET"
0 11  * * *    curl -s -X POST .../api/agents/news-monitoring        -H "x-agent-secret: $AGENT_SECRET"
0 12  1 * *    curl -s -X POST .../api/agents/fundamental-analysis   -H "x-agent-secret: $AGENT_SECRET"
0 12  * * 1    curl -s -X POST .../api/agents/macro-scenario         -H "x-agent-secret: $AGENT_SECRET"
30 22 * * 1-5  curl -s -X POST .../api/agents/research-target-check  -H "x-agent-secret: $AGENT_SECRET"
30 12 * * 1    curl -s -X POST .../api/agents/weekly-report          -H "x-agent-secret: $AGENT_SECRET"
```

Para editar: `crontab -e` na Amaia (host `amaia-bot...amaia-agent`, projeto `amaia-agent`). Backups do crontab ficam em `data/crontab.bak.*`. `macro-scenario` tem idempotência semanal (responde `skipped` se o cenário da semana já existe). `research-target-check` roda após o snapshot EOD para usar preços de fechamento.

---

## O que cada agente faz

### strategy-check
- Lê último batch importado de cada titular
- Compara alocação real vs. alvo (por classe de ativo) usando `allocation_rules` da estratégia
- Cria alerta `warning` se desvio > threshold configurado
- Janela de deduplicação: 48h

### news-monitoring
- Filtra posições de renda variável (stocks_br, stocks_intl, fiis, etf_br, etf_intl)
- Busca notícia por ticker via Brave Search (`freshness=pd`), priorizando fontes de qualidade (Valor, InfoMoney, Brazil Journal, BTG, Exame) e completando com busca geral; dedup por URL, resiliente a falha de busca
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

### macro-scenario
- Gera o cenário macro global (BCB Focus/SGS + FRED EUA) com Claude Opus, saída validada por schema
- Grava em `scenario_definitions` (global) e registra a execução em `agent_runs`
- Idempotência por semana ISO: não recria o cenário da semana (responde `skipped`)
- Não usa dado de família; alimenta o card de cenário do dashboard

### research-target-check
- Cruza o preço-alvo das `research_observations` da família com as posições (ações/ETF)
- Alerta quando o papel está acima do alvo (esticado) ou tem recomendação de venda
- Régua de poucas casas (visão da casa / consenso), validade de 120 dias, moeda e materialidade mínima (R$ 5k)
- Janela de deduplicação: 7 dias
- Depende de research com preço-alvo importado em `/research`

### weekly-report
- Consolida por família: cenário macro + visão das casas + posições em atenção (alertas dos últimos 10 dias) por titular
- Claude Opus escreve a narrativa por titular e o resumo da família (saída validada por schema)
- Grava em `weekly_reports` (um por família por semana), idempotente por semana ISO
- Exibido no card do dashboard (mais recente) e em `/relatorios` (histórico)

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
