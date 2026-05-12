# ANR-005 — Agente de monitoramento: arquitetura e cadência

**Status:** aprovado  
**Data:** 2026-05-11  
**Autor:** Rodrigo Tazima

---

## Decisão

Um agente Claude Sonnet rodando 2x/dia (8h e 18h BRT) via cron na VM GCP, com acesso ao portfólio atual e à estratégia dos titulares, produzindo alertas estruturados (info/warning/critical) persistidos no Supabase.

---

## Contexto

O requisito é monitorar ativos para detectar problemas que justifiquem saída rápida ou rebalanceamento. O agente precisa ser rápido (< 5min/execução), ter baixo custo por rodada, e produzir alertas acionáveis — não ruído.

---

## Design do agente

### Dados de entrada (por execução)
1. Portfólio atual de cada titular (lido do Supabase após sync das 7h)
2. Estratégia de cada titular (documento de configuração)
3. Preços de fechamento do dia anterior (Yahoo Finance ou Alpha Vantage)
4. Headlines de notícias dos últimos X horas para os tickers em carteira (NewsAPI ou Infomoney scrape)
5. Agenda macroeconômica do dia (COPOM, IPCA, Selic, Fed — calendário econômico)

### Processo de análise
```
Para cada titular:
  1. Verificar desvio de alocação atual vs. alvo (threshold: ±5%)
  2. Para cada ativo:
     a. Variação de preço anormal (> 2σ vs. média 30d)
     b. Notícias relevantes (Claude classifica relevância)
     c. Vencimento próximo (renda fixa: 30/15/7 dias)
  3. Verificar eventos macro do dia
  4. Verificar status do último sync (consent expirado?)

→ Produz lista de alertas com: severity, titular, ticker (opcional), 
  title, description, recommendation, sources[]
```

### Modelo escolhido: Claude Sonnet

**Por quê Sonnet e não Opus:**
- Tarefa estruturada e repetível (não requer raciocínio profundo)
- 2x/dia = ~60 execuções/mês — custo acumula
- Sonnet é suficiente para classificar notícias e detectar padrões simples
- Prompt com cache de sistema (estratégias dos titulares) reduz custo ~80% no cache hit

**Prompt caching:**
- Contexto de sistema (estratégias, instruções de análise): cache de 1h
- Dados variáveis (portfólio, notícias, preços): sem cache (mudam a cada rodada)

---

## Fontes de dados

| Dado | Fonte | Custo | Latência |
|---|---|---|---|
| Preços BR (B3) | Yahoo Finance via `yfinance` | Grátis | D-1 ou delayed |
| Preços EUA | Yahoo Finance | Grátis | D-1 ou delayed |
| Notícias BR | NewsAPI + Infomoney (scrape) | $0–$50/mês | < 1h |
| Calendário econômico | Investing.com API ou scrape | Verificar ToS | Diário |
| Câmbio USD/BRL | BCB API (grátis, oficial) | Grátis | D-1 |

---

## Formato de alerta (output do agente)

```json
{
  "alerts": [
    {
      "id": "uuid",
      "severity": "warning",
      "titular": "rodrigo",
      "ticker": "PETR4",
      "title": "Queda atípica: PETR4 -8.3% em um dia",
      "description": "PETR4 caiu 8.3% hoje, contra média de -1.2% nos últimos 30 dias (2σ). Notícias: anúncio de dividendos abaixo do esperado.",
      "recommendation": "Verificar tese de investimento. Se foi comprado por dividendos, reavaliar alocação.",
      "sources": ["https://..."],
      "generated_at": "2026-05-11T08:03:00-03:00"
    }
  ]
}
```

---

## Infraestrutura de execução

```
GCP VM (Amaia)
  crontab:
    0 7 * * 1-5  → sync bancário (Pluggy/Plaid)
    0 8 * * 1-5  → agente de monitoramento (manhã)
    0 18 * * 1-5 → agente de monitoramento (tarde)

  Script: scripts/run-monitoring-agent.ts (Node.js + tsx)
    1. Lê portfólio do Supabase
    2. Busca preços e notícias
    3. Chama Claude API
    4. Persiste alertas no Supabase
    5. Envia email/webhook se severity >= warning
```

Nos fins de semana o agente não roda (mercado fechado). Pode ser habilitado sob demanda para monitorar eventos internacionais (ex. Fed meeting em sábado).

---

## Tratamento de falhas

| Falha | Comportamento |
|---|---|
| Claude API indisponível | Log de erro, retry em 15min, alerta `critical` se falhar 3x |
| Fonte de notícias indisponível | Continua sem notícias, nota na descrição dos alertas |
| Portfólio desatualizado (sync falhou) | Alerta `critical` "Portfólio desatualizado — sync falhou" |
| Execução > 10 minutos | Timeout, log de erro, retry no próximo horário |

---

## Calibração (evitar ruído)

- Primeira semana: thresholds generosos para coletar baseline
- Semana 2–4: ajustar threshold de variação de preço com base no feedback de falso positivo
- Meta: < 10% de falso positivo (alertas que o usuário descartou sem ação)
- Feedback loop: botão "descartado" no dashboard → salvo no Supabase → usado para calibrar prompts

---

## Consequências

- Agente roda apenas em dias úteis (padrão). Adicionar flag `--force` para rodar manualmente.
- Histórico de alertas é a fonte de verdade para calibração futura do agente.
- Em fases futuras: usar histórico de alertas + feedback para fine-tuning do prompt via `/learn`.
- Custo estimado por execução: ~$0.05–0.15 (Sonnet com cache) → ~$6–18/mês para 2x/dia.
