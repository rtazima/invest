# Roadmap — Camada de análise profissional

Atualizado: 2026-06-30
Referência: `docs/product/prd-analise-profissional.md` (v2.3), `docs/product/devolutiva-revisao-analise-profissional.md`

Estado de cada frente do PRD: o que está em produção e o que falta.

## Em produção

| Entrega | Onde | Commit |
|---|---|---|
| Fase 1 — cenário macro (BCB Focus/SGS + FRED EUA), card no dashboard | `src/lib/scenario/`, `ScenarioCard` | — |
| Fase 2 — upload e extração de research (Claude lê PDF, saída por schema), isolado por família | `/research`, `src/lib/research/`, bucket privado | — |
| Ponte research → cenário (visão das casas no card) | `getRecentHouseViews`, `ScenarioCard` | #4 |
| Fase 3 — preço-alvo do research × carteira → alerta de esticado/venda | `src/lib/alerts/research-target.ts` | #5 |
| Automação via cron na Amaia (cenário, notícia, preço-alvo) | `docs/runbooks/agents.md` | #6 |
| Fundação de política + motor determinístico (validateProposedAllocations, validatePortfolioState) | `src/lib/policy/validate.ts` | #7 |
| Campos de política no editor (perda máx, concentração, restritos) + versionamento | `StrategyPanel`, `strategy_versions` | #8 |
| Alertas de concentração e classe restrita no strategy-check | `src/lib/alerts/strategy.ts` | #9 |
| Login por e-mail e senha (substitui magic link), MFA desativado por ora | `LoginForm`, `middleware.ts` | — |

Tabelas criadas: `scenario_definitions`, `agent_runs`, `research_reports`, `research_observations`, `strategy_versions`. Campos novos em `strategies`: `max_loss_pct`, `max_single_asset_pct`.

## Pendente — próximas frentes

### Fase 4 — sugestões táticas e relatório semanal
- Relatório semanal consolidado por família e titular (agente `weekly-report`): cenário atual, o que mudou, posições em atenção, ação sugerida. É a unidade de consumo que tira do ruído de alerta avulso.
- Sugestão de ajuste de meta dentro das bandas, com tela de antes/depois, aprovação versionada e rollback. Usa o motor `validatePortfolioState` que já existe.
- Não depende de parecer jurídico enquanto for só a primeira família.

### Fase 5 — e-mail automático
- Ingestão de research por Gmail API (conta dedicada, escopo mínimo), depois de validar bem o upload manual.

### Pré-condições de multi-família (gates)
- Gate jurídico (CVM): parecer antes de servir alerta/relatório/sugestão personalizada a terceiros. Bloqueia abrir as fases 3/4 para fora, não para a primeira família.
- Teste adversarial de isolamento (RLS, Storage, cache, logs, prompts) antes da segunda família.
- Licença do research e LGPD para dados de terceiros.

## Refinamentos deferidos (conscientemente)

- Liquidez mínima como alerta: o check ingênuo (só a classe `liquidity`) dá falso positivo (ex: Grasi com liquidez em renda fixa curta). Precisa de definição por `liquidity_days`. Hoje só a banda da classe cobre.
- Perda máxima da carteira como alerta: precisa de P&L agregado confiável em BRL (o dado hoje mistura moedas). O motor já tem a checagem pronta.
- Consenso completo (mediana/dispersão por instrumento canônico) quando houver 3+ casas. Hoje a régua de poucas casas está no alerta de preço-alvo, sem snapshot histórico (`consensus_snapshots`).
- `conclusion_evidence`: ligar cada conclusão às fontes (clicável até PDF/página). Fecha a auditoria.
- Calibração de cenário: gravamos os cenários, mas não avaliamos acerto ao longo do tempo (a régua mensal do PRD). Falta o job de avaliação.
- `securities` canônico: hoje usa ticker livre. Necessário quando consenso e multi-família crescerem.
- Turbinar `news-monitoring` com fontes preferenciais (BTG público, Valor, Brazil Journal) via `site:` no Brave.

## Dívida técnica conhecida

- Prompt do `fundamental-analysis` tem "CDI ~10,5%" chumbado (defasado; Selic em 14,25%).
- Dois arquivos de middleware no repo (`middleware.ts` e `src/middleware.ts`); vale consolidar.
- Colunas/tabelas novas não estão nos tipos gerados do Supabase; acessadas via client untyped (padrão do projeto, para não perder os aliases custom na regeneração).

## Operacional

- Cron na Amaia (UTC, BRT−3): strategy-check 10h, news-monitoring 11h, macro-scenario seg 12h, fundamental dia 1 às 12h, research-target-check dias úteis 22h30. Detalhe em `docs/runbooks/agents.md`.
- Disparo manual: scripts `run-macro-scenario.ts`, `run-research-target.ts`; demais via `POST /api/agents/*` com `x-agent-secret`.
- Deploy: push na `main` → Vercel produção. Sem preview por branch neste projeto.
