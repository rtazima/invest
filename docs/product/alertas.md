# Módulo de Alertas

## O que é

Sistema de alertas automáticos multi-camada para monitoramento do portfólio familiar. Alertas são gerados por agentes autônomos e exibidos na página `/alerts` e no dashboard.

## Tipos de alerta

| `generated_by` | Fonte | Cadência |
|---|---|---|
| `strategy-check` | Desvio de alocação vs. estratégia | 2×/dia |
| `news-monitoring` | Notícias relevantes via Brave + Haiku | 2×/dia |
| `fundamental-analysis` | Análise fundamentalista via scrapers + Opus | Mensal |

## Severidades

- `info` — empresa/fundo saudável, sem urgência
- `warning` — ponto de atenção, monitorar
- `critical` — deterioração clara, ação recomendada

## Ações disponíveis

**Individual (por alerta):**
- Marcar como lido (clique no card)
- Silenciar: 7 dias / 30 dias / Sempre (por ticker + tipo)
- Dispensar (marca como `dismissed`)

**Em lote:**
- Selecionar todos → Marcar como lido
- Selecionar todos → Silenciar 30 dias
- Selecionar todos → Dispensar

## Mutes

Silenciar cria uma entrada em `alert_mutes` com `ticker` e `alert_type`. Match parcial:
- Silenciar um ticker específico bloqueia alertas daquele ticker em qualquer agente
- Silenciar um tipo bloqueia alertas daquele agente em qualquer ticker
- O badge de não lidos e o dashboard aplicam o mesmo filtro de mutes

## Estrutura dos alertas fundamentalistas

- Título: `{TICKER} — {Comprar|Manter|Reduzir} | Análise fundamentalista`
- Descrição: `{Titular} · R$ {valor} | {análise qualitativa} | {análise quantitativa} | {valuation}`
- Recomendação: veredicto em uma frase com a principal razão
- `sources[0]`: link do gráfico (Status Invest para BR, Yahoo Finance para intl)
- `sources[1..3]`: URLs das notícias Brave usadas na análise

## Runbook

Ver `docs/runbooks/agents.md` para debug e execução manual dos agentes.
