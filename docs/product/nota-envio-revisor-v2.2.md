# Nota de envio ao revisor — PRD v2.2

Segue a v2.2 do PRD da camada de análise profissional, já com os teus cinco ajustes da réplica incorporados. Antes de consolidar como direcionamento oficial, preciso só que você bata uns números que entraram como meta inicial.

## O que entrou desde a versão que você revisou

Os cinco ajustes da tua réplica, todos no texto:

- Firewall global versus privado virou regra no schema. `scenario_definitions` só toca fonte pública; `family_scenario_implications` carrega linhagem apontando relatório e família de origem; não existe caminho de `research_*` de uma família para entidade global.
- Barreira jurídica subiu pra cobrir a fase 3, com a regra de que nenhuma funcionalidade personalizada para terceiros (alerta e relatório por posição incluídos) é liberada antes do parecer. Os dois links da CVM estão nas referências.
- Régua de N pequeno virou tabela formal (1 = visão da casa, 2 = duas visões com gap, 3+ = cobertura de research). Mudança de rating com uma casa é fato, não ação sugerida.
- Proteção do research passou a cobrir toda a superfície além do RLS (Storage, URL assinada, cache, embeddings, log, prompt de LLM, dado derivado), com research classificado como confidencial de terceiro.
- Rastreabilidade operacional ficou como requisito desde a primeira família; DLQ e retry pesado seguem faseáveis.

Mais a disciplina de calibração que você desenhou (horizonte 1/3/12 meses, avaliação mensal, peso só ajusta após 24+ maturadas).

E uma rodada final de oito ajustes que fizemos depois: os três gates de liberação explícitos (A isolamento técnico, B licença/LGPD/termos do LLM, C parecer CVM); vínculo da política ao dado de posição e lote; inventário dos dados que o motor determinístico exige, separando o que já existe do que falta criar; autorização por papéis (owner, admin, editor, viewer) com log de auditoria; entidade `conclusion_evidence` ligando cada conclusão às fontes; metas mensuráveis de aceite; e política de retenção e exclusão.

## O que preciso que você ratifique

Coloquei estes números como meta inicial, marcados como "a ratificar". Eles definem a régua de aceite, então quero teu aval ou contraproposta:

- Precisão de extração de research nos campos críticos: ativo e moeda acima de 98%, rating e preço-alvo acima de 95%, medidos contra a base de PDFs reais.
- Frescor de cenário: marcar como desatualizado após 8 dias sem atualização (mais de uma rodada Focus perdida).
- Saída do modo sombra: mínimo de 30 avaliações humanas e taxa de falso positivo abaixo de 10%.

## O que não é pra você decidir, só sinalizando

O posicionamento regulatório (Gate C) e os prazos de retenção do Gate B dependem de parecer jurídico, não de produto. Estão marcados como pendência jurídica, não como decisão tua. Se quiser opinar, ótimo, mas não trava a consolidação do resto.

Com esses números fechados, considero a v2.2 pronta como direcionamento oficial.
