# Visão do produto — Invest

## Propósito

Dar à família Tazima uma visão única e inteligente do patrimônio investido, hoje fragmentado entre XP, BTG e Nomad em três titulares distintos (Rodrigo, esposa e filhos).

## Problema

Investimentos espalhados em múltiplos bancos e corretoras, distribuídos entre contas de titulares diferentes, sem visão consolidada. Cada banco tem seu app, cada conta é acessada separadamente, e não existe inteligência para correlacionar posições, sugerir rebalanceamentos ou monitorar riscos de forma proativa.

O resultado: decisões de investimento sem contexto global, alertas perdidos, e tempo gasto navegando entre apps em vez de analisar.

## Para quem

Rodrigo, uso pessoal e familiar. Não é um SaaS — é uma ferramenta privada de gestão patrimonial.

## O que resolve

- Consolida portfólio de XP, BTG e Nomad em uma tela, por titular e no total
- Monitora ativos 2x/dia com agente Claude e alerta quando algo merece atenção
- Recomenda alocação de capital novo com base na estratégia de cada titular
- Mantém histórico mês a mês para acompanhar evolução patrimonial
- Classifica alertas em info / warning / critical para priorizar ação

## O que não é

- Não executa ordens
- Não é assessoria regulada (CVM)
- Não é para terceiros — escopo restrito à família Tazima
- Não substitui o assessor de investimentos

## Métricas de sucesso

- Sync automático rodando sem intervenção manual por 30 dias consecutivos
- Agente de monitoramento com < 5% de falso positivo nas primeiras 4 semanas
- Tempo para identificar um alerta relevante: < 2h após abertura do mercado
- Dashboard carrega portfólio completo em < 3s

## Links

- Repo: https://github.com/rtazima/invest
- Produção: a definir (Vercel + GCP)
