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
| Fase 4 (parcial) — relatório semanal consolidado (card + `/relatorios`) | `src/lib/reports/`, agente `weekly-report` | #11 |
| Fase 4 — sugestão de meta sensível ao cenário + histórico/rollback de política | editor de estratégia, `StrategyHistory` | #14 |

Tabelas criadas: `scenario_definitions`, `agent_runs`, `research_reports`, `research_observations`, `strategy_versions`, `weekly_reports`. Campos novos em `strategies`: `max_loss_pct`, `max_single_asset_pct`.

## Pendente — próximas frentes

### Fase 4 — concluída
- Relatório semanal consolidado (em produção, ver acima).
- Sugestão de alocação sensível ao cenário macro, validada pelo motor determinístico (proposta com violação crítica não passa).
- Histórico versionado da política com rollback (`/holders/[id]/strategy`).
- Pendente menor: tela de antes/depois inline mais rica (hoje o "alvo vs real" da página + o rollback cobrem o essencial).

### Fase 5 — e-mail automático
- Ingestão de research por Gmail API (conta dedicada, escopo mínimo), depois de validar bem o upload manual.

### Pré-condições de multi-família (gates)
- Gate jurídico (CVM): parecer antes de servir alerta/relatório/sugestão personalizada a terceiros. Bloqueia abrir as fases 3/4 para fora, não para a primeira família.
- Teste adversarial de isolamento (RLS, Storage, cache, logs, prompts) antes da segunda família.
- Licença do research e LGPD para dados de terceiros.

## Refinamentos deferidos (conscientemente)

- Liquidez mínima como alerta: o check agora usa a definição correta (ilíquido = `liquidity_days` > 30 dias) no `strategy-check`. Porém os parsers de import NÃO preenchem `liquidity_days` na renda fixa (0 de 28 posições), então o check fica inerte (tudo conta como líquido). O gargalo real é de dado, não de lógica. Próximo passo: preencher `liquidity_days` nos parsers CSV/XLSX (usar `maturity_date` + tipo de instrumento como fallback, tratando Tesouro Selic/CDB de liquidez diária como líquido apesar do vencimento longo).
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
