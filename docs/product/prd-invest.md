# PRD — Invest: Plataforma de gestão patrimonial familiar

**Status:** rascunho para revisão  
**Autor:** Rodrigo Tazima  
**Data:** 2026-05-11  
**Versão:** 0.1

---

## Contexto e objetivo

Rodrigo tem investimentos em XP, BTG e Nomad, distribuídos entre contas próprias, da esposa e dos filhos. O objetivo desta plataforma é consolidar tudo em um único lugar, com sincronização automática, monitoramento proativo via agente de IA e recomendações de alocação baseadas na estratégia de cada titular.

---

## Titulares e contas

| Titular | XP | BTG | Nomad | Observações |
|---|---|---|---|---|
| Rodrigo | ✓ | ✓ | ✓ | Conta internacional em USD |
| Esposa | ✓ | ✓ | — | |
| Filhos | ✓ | — | — | Menores de idade — LGPD parental |

---

## Features

### F1 — Dashboard de portfólio

**Visões disponíveis:**
- Global: patrimônio total consolidado (todos os titulares)
- Por titular: posição de cada membro da família
- Por instituição: quanto está em XP, BTG e Nomad
- Por classe de ativo: renda fixa, renda variável, fundos, internacional, liquidez
- Por tema/tese: ex. dividendos, crescimento, proteção, internacional

**Dados exibidos por ativo:**
- Nome, ticker, quantidade, preço médio, preço atual, P&L, % do portfólio
- Para renda fixa: vencimento, indexador (CDI%, IPCA+, prefixado), liquidez (D+0, D+1, etc.)
- Para fundos: cota atual, rentabilidade no período, benchmark

**Evolução patrimonial:**
- Gráfico mês a mês (patrimônio total e por titular)
- Rentabilidade no período vs. CDI, IPCA e IBOVESPA
- Aporte acumulado vs. rendimento gerado

**Critérios de aceite:**
- Dashboard carrega em < 3s com portfólio completo
- Atualiza automaticamente após cada sync
- Valores em BRL com câmbio do dia para ativos em USD
- Fundos exibem nota de defasagem de cota (D+1/D+2)

---

### F2 — Sincronização bancária

**Mecanismo:**
- XP e BTG: Pluggy API (Open Finance Brasil)
- Nomad: Plaid API (Open Banking EUA) ou CSV import manual
- Fallback geral: importação CSV padronizado

**Frequência:**
- Sync automático 1x/dia às 7h (antes do agente de monitoramento)
- Sync manual disponível no dashboard (botão "Atualizar")
- Webhooks Pluggy para notificações push (quando suportado)

**Tratamento de erros:**
- Consent expirado: notificação para re-autenticar (não quebra o dashboard — mostra última posição conhecida com timestamp)
- Rate limit Pluggy (1 req/s por item): fila com delay entre contas
- Falha parcial: sync das outras contas continua, a falha é logada e alertada

**Critérios de aceite:**
- Sync automático roda sem intervenção manual por 30 dias seguidos
- Expiração de consent gera notificação em < 1h
- Última posição conhecida sempre visível, com indicação de quando foi atualizada
- Importação CSV aceita formatos XP, BTG e Nomad (documentados em `docs/runbooks/csv-import.md`)

---

### F3 — Agente de monitoramento (2x/dia)

**Quando roda:** 8h e 18h (horário de Brasília), via cron na VM GCP

**O que verifica:**
1. Notícias e eventos relevantes para os tickers em carteira (fontes: Infomoney, Valor, Reuters BR, Yahoo Finance)
2. Movimentos de preço anormais (desvio > 2 sigma vs. média 30 dias)
3. Vencimentos de renda fixa nos próximos 30 dias
4. Desvio de alocação vs. estratégia-alvo de cada titular (threshold configurável)
5. Eventos macroeconômicos do dia (SELIC, IPCA, decisões do COPOM, Fed)

**Saída:** lista de alertas com severidade, ativo afetado, descrição e recomendação de ação

**Severidades:**
- `INFO`: contexto útil, sem urgência (ex. "BBAS3 caiu 2% junto com o setor")
- `WARNING`: requer atenção (ex. "PETR4 queda atípica de 8%, verificar notícias")
- `CRITICAL`: ação recomendada imediata (ex. "Consent XP expirado, portfólio desatualizado")

**Critérios de aceite:**
- Agente roda em < 5 minutos por execução
- Falso positivo < 10% nas primeiras 4 semanas (calibrar threshold com feedback)
- Alertas ficam visíveis no dashboard e no histórico
- Alertas `CRITICAL` geram push notification (via email ou webhook, a definir)

---

### F4 — Recomendação de alocação

**Quando usar:** Rodrigo quer investir um valor X para si, para a esposa ou para os filhos

**Como funciona:**
1. Usuário informa: titular, valor disponível, e preferência (liquidez imediata? maior retorno? proteção?)
2. Agente lê: estratégia do titular, posição atual, desvio vs. alocação-alvo
3. Agente gera: 2 a 3 opções de alocação com justificativa, divididas por classe de ativo e produto específico
4. Usuário pode pedir refinamento antes de executar manualmente na corretora

**Restrições da recomendação:**
- Sempre cita o produto e a corretora onde encontrar
- Nunca executa ordem — apenas recomenda
- Inclui disclaimer ("não é assessoria regulada")
- Leva em conta liquidez mínima da carteira (% em liquidez imediata por titular)

**Critérios de aceite:**
- Recomendação gerada em < 30s
- Cada opção inclui: produto sugerido, valor, classe, justificativa, risco resumido
- Histórico de recomendações salvo para aprendizado do agente

---

### F5 — Sistema de alertas

**Tipos de alerta:**
- Monitoramento automático (gerado pelo agente 2x/dia)
- Vencimento de renda fixa (30, 15 e 7 dias antes)
- Desvio de alocação (quando portfólio desvia > X% da estratégia-alvo)
- Sync falhou / consent expirou
- Evento macro relevante (COPOM, divulgação IPCA, decisão Fed)

**Delivery:**
- Dashboard (sempre, com badge de não-lido)
- Email (para `WARNING` e `CRITICAL`)
- Webhook configurável (para integração futura com Telegram ou Slack)

**Critérios de aceite:**
- Alertas não lidos visíveis no topo do dashboard
- Histórico completo de alertas com filtro por severidade, titular e data
- Alertas `CRITICAL` entregues em < 5 minutos após geração

---

### F6 — Estratégia por titular

**O que é:** documento de estratégia de cada titular, usado pelo agente de recomendação

**Campos:**
- Perfil de risco (conservador / moderado / arrojado)
- Horizonte de investimento
- Objetivo principal (ex. aposentadoria, educação dos filhos, renda passiva)
- Alocação-alvo por classe (% em renda fixa, variável, internacional, liquidez)
- Liquidez mínima obrigatória
- Ativos ou setores a evitar

**Critérios de aceite:**
- Editável pelo usuário no dashboard
- Agente de recomendação usa a estratégia como contexto principal
- Agente de monitoramento usa a estratégia para detectar desvios

---

## Non-goals (fora de escopo desta versão)

- Execução de ordens nas corretoras
- Criptoativos (pode ser considerado em versão futura)
- Multi-usuário / compartilhamento com assessor
- Declaração de IR automatizada (pode ser fase 4)
- Comparação com benchmarks customizados

---

## Fases de entrega

| Fase | Entregável | Critério de "pronto" |
|---|---|---|
| 1 — MVP | Dashboard com import CSV + estratégias + alertas manuais | Rodrigo consegue ver portfólio consolidado |
| 2 — Sync | Pluggy + Plaid integrados + sync automático 1x/dia | 30 dias sem intervenção manual |
| 3 — Agente | Monitoring agent 2x/dia + alertas automáticos | < 10% falso positivo em 4 semanas |
| 4 — Recomendação | Agente de alocação + histórico de recomendações | Rodrigo usa a recomendação como base de decisão |
| 5 — Histórico | Gráficos históricos mês a mês + relatórios | Evolução patrimonial dos últimos 12 meses visível |

---

## Perguntas abertas para revisão

1. **Nomad**: preferir Plaid ou CSV manual como mecanismo de sync? Plaid exige integração e aprovação, CSV é mais simples mas manual.
2. **Push notification**: email basta para `CRITICAL`, ou quer Telegram/WhatsApp também?
3. **Estratégia dos filhos**: é diferente de "perfil conservador padrão"? Precisa documentar.
4. **Câmbio**: usar cotação do BCB (grátis, D-1) ou API em tempo real paga?
5. **Threshold de desvio de alocação**: qual % de desvio dispara `WARNING`? Sugestão: 5%.
