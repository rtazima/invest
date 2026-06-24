# PRD — Camada de análise profissional (cenário macro + research das casas)

Versão: 2.3
Status: direcionamento oficial ratificado pelo revisor (pré-condição jurídica para terceiros pendente)
Autor: Rodrigo Tazima
Data: 2026-06-23
Relacionado: `docs/product/prd-invest.md`, `docs/product/estrategias-por-titular.md`, `docs/product/revisao-produto-analise-profissional.md` (review externo), `docs/product/devolutiva-revisao-analise-profissional.md`, ANR-005 (agentes 2x/dia)

Histórico: a v1 propôs a camada de análise para uma única família. A v2 incorporou o product review de 23/06/2026 e a decisão de abrir a plataforma para multi-família. A v2.1 consolidou os cinco ajustes da réplica do revisor (firewall de dados global versus privado, barreira jurídica cobrindo a fase 3, régua formal de consenso para N pequeno, superfície de proteção do research além do RLS, e rastreabilidade operacional desde a primeira família) mais a disciplina de calibração de cenário. A v2.2 acrescentou os três gates de liberação explícitos, o vínculo da política ao dado de posição e lote, o inventário dos dados que o motor determinístico exige, o modelo de autorização por papéis, a entidade de evidência por conclusão, metas mensuráveis de aceite e a política de retenção e exclusão. Esta v2.3 trava as metas mensuráveis nos números ratificados pelo revisor (extração 99,5%/98,5% com amostra estratificada por casa e formato, frescor com estado `unavailable` após 15 dias ou duas falhas, modo sombra com 60 avaliações, zero falso positivo crítico e abaixo de 5% não crítico), com o revisor classificando o documento como pronto para direcionamento oficial.

Referências regulatórias: [CVM, consultor de valores mobiliários](https://www.gov.br/investidor/pt-br/investir/como-investir/profissionais-do-mercado/consultor-de-valores-mobiliarios), [Resolução CVM 20 consolidada](https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/resolucoes/anexos/001/resol020consolid.pdf).

## 1. Problema

A análise de hoje é toda bottom-up por ativo. Os três agentes (`strategy-check`, `news-monitoring`, `fundamental-analysis`) olham ticker a ticker e gravam alertas avulsos na tabela `alerts`. Não existe camada macro, cenário, nem a visão das casas de análise, e o `strategy-check` valida se a carteira bateu a meta sem nunca questionar se a meta ainda faz sentido dado o momento.

O risco que a v1 não tratava: transformar narrativa de IA em recomendação implícita sem uma camada determinística de política, qualidade de dados e rastreabilidade. Numa plataforma que vai servir outras famílias, isso deixa de ser detalhe e vira o centro do desenho.

## 2. Mudança de escopo: multi-família

A plataforma passa a atender mais de uma família. Consequências que atravessam todo o PRD:

Os dados de cada família são isolados por RLS, testado de forma adversarial. O research que uma família recebe das suas corretoras não pode ser usado por outra: research e consenso são sempre por família. O cadastro de instrumentos e o cenário macro, por serem universais, são globais e compartilhados. E servir sugestão de investimento a terceiros toca a fronteira regulatória da CVM, o que vira pré-condição da abertura (seção 8).

Firewall de dados, global versus privado. Esta é a regra que não se quebra: o que é global só pode usar dado público, licenciado ou próprio. O research da família A nunca altera cenário, alerta ou sugestão da família B, nem de forma agregada nem "anonimizada". O cenário global (`scenario_definitions`) se alimenta apenas de fonte pública. A leitura por família (`family_scenario_implications`) pode usar o research daquela própria família, com linhagem de dados explícita: cada conclusão personalizada aponta de qual relatório e de qual família o dado veio.

### Autorização e papéis

RLS resolve isolamento entre famílias, não quem faz o quê dentro de uma família. Cada membro tem um papel, e ações sensíveis ficam em trilha de auditoria.

| Papel | Vê patrimônio consolidado | Sobe research | Edita política | Aprova sugestão | Convida/remove membro |
|---|---|---|---|---|---|
| owner | sim | sim | sim | sim | sim |
| admin | sim | sim | sim | sim | não |
| editor | sim | sim | não | não | não |
| viewer | sim | não | não | não | não |

Toda ação sensível (editar política, aprovar ou reverter sugestão, subir ou excluir research, convidar ou remover membro) grava em log de auditoria com autor, alvo, antes e depois, e timestamp. O papel é por família; um usuário pode ter papéis diferentes em famílias diferentes.

## 3. Princípio central: política determinística separada de síntese por IA

O sistema separa três camadas que nunca se misturam:

Dados e cálculos verificáveis, com fonte, timestamp, unidade e moeda. A política de investimento e as restrições de cada titular, explícitas e versionadas. E a síntese, explicação e priorização produzidas pelo modelo.

A IA propõe e explica dentro das bandas da política. Um motor determinístico valida toda sugestão contra a política antes de ela existir como algo aplicável. Nenhuma sugestão de IA pode violar liquidez mínima, limite de risco, instrumento permitido ou banda tática. O modelo sintetiza evidência e torna trade-offs visíveis; ele não define política.

## 4. Objetivo e não-objetivos

Objetivo: produzir uma leitura consolidada da carteira de cada família, contextualizada por cenário macro (Brasil e exterior), pelo research que a família recebe, e pela política de cada titular, com toda conclusão rastreável até dado e fonte.

Não-objetivos nesta entrega: rebalanceamento automático, execução de ordens, scraping de portal logado de corretora, e abertura a terceiros antes da validação regulatória.

## 5. Personas

Rodrigo é o operador da própria família e o primeiro usuário. Recebe research de XP e BTG, tem patrimônio em USD no Nomad, e quatro titulares com perfis distintos (arrojado, conservadora com liquidez em 30 dias, e duas crianças com horizonte de 15+ anos). As outras famílias têm composição própria de corretoras, titulares e perfis, e os dados delas são invisíveis entre si.

## 6. Escopo

A v1 tinha "frentes" e uma fase 0 de fundações. Reorganizamos: a fundação sobe em paralelo, não como portão único que trava toda entrega. Um cenário macro informativo, que não dá sugestão nenhuma, pode existir com segurança antes do motor determinístico estar pronto.

### Fundação (em paralelo com as frentes)

Política de investimento versionada por titular: objetivo, horizonte, liquidez mínima, perda máxima tolerada, alocação estratégica de longo prazo e bandas táticas por classe. Cadastro canônico de instrumentos (`securities`), usado no lugar de ticker livre. Motor determinístico que valida qualquer sugestão contra a política antes de ela ser apresentada como aplicável.

A política também corrige um erro da v1: liquidez, possibilidade de resgate, marcação a mercado, risco de crédito e tributação são dimensões separadas. Prefixado de prazo curto não é tratado automaticamente como caixa de curto prazo.

A política se amarra ao dado real de posição, não a uma abstração. A validação de banda e de restrição roda contra as posições do lote mais recente (`positions` ligadas ao `import_batches` corrente), por titular. Uma sugestão é checada contra a foto atual da carteira daquele titular, e a checagem registra qual lote e qual data de posição foram usados, para a conclusão ser reproduzível.

Os dados que o motor determinístico exige, e onde estão. A promessa de que "nenhuma sugestão viola liquidez ou risco" só é verificável se esses campos existirem. Já estão em `positions`: indexador (`indexer`), taxa (`indexer_rate`), vencimento (`maturity_date`), liquidez (`liquidity_days`) e preço médio (`avg_price`). Faltam e precisam ser criados ou derivados antes da frente 4: emissor (e grupo econômico, para limite por emissor), carência, cobertura FGC, duration (calculada do fluxo) e tratamento tributário (derivado de tipo de instrumento e prazo: tabela regressiva de IR, come-cotas, isenção de LCI/LCA/FII). Esses campos entram em `securities` quando são do instrumento, ou em `positions` quando são da posição. Sem esse inventário completo, a frente 4 não libera: o motor não pode prometer o que não consegue medir.

### Frente 1 — Cenário macro informativo

Cenário global versionado, produzido uma vez para o mercado e interpretado por família. Card no dashboard sem nenhuma sugestão de estratégia.

Brasil: Boletim Focus e séries do BCB (Selic, IPCA, câmbio, PIB, IGP-M, mais Selic meta, IPCA 12m e dólar PTAX correntes). Exterior: bloco de EUA via FRED incluído já na fase 1 por causa do patrimônio real em USD, com Fed Funds, Treasury de 2 anos, Treasury de 10 anos, inclinação 2s10s, CPI cheio e núcleo. Crédito (spread, bonds, ETF de crédito) só entra na fase 1 se houver exposição material a crédito; caso contrário fica para quando aparecer. Notícia macro e eleitoral via Brave Search. Calendário eleitoral 2026 como nota editável pelo usuário, não dado automático.

O cenário se alimenta só de fonte pública ou própria (firewall da seção 2). Guarda data e hora de referência de cada entrada, probabilidades que somam 100%, premissas quantificadas, gatilhos que mudam a probabilidade, evidências contrárias, implicações por exposição e instrumento, e comparação com a versão anterior e com o que ocorreu. As probabilidades o modelo propõe e justifica; o usuário ancora e aprova; a calibração é acompanhada ao longo do tempo.

Disciplina de calibração. O registro começa já, mas o score nunca altera peso na largada. Cenário semanal é altamente correlacionado: 52 semanas não são 52 observações independentes. Então a previsão é registrada com horizonte explícito (1, 3 e 12 meses), avaliada mensalmente mesmo quando a narrativa é atualizada toda semana. Disciplina qualitativa aparece após 6 previsões maturadas. Métrica comparável de calibração começa após 12 previsões mensais maturadas por horizonte. Histórico só ajusta peso ou confiança depois de 24 ou mais observações maturadas, e sempre como sinal auxiliar.

### Frente 2 — Research manual auditável

Upload de PDF de XP e BTG, isolado por família. A extração é um pipeline de dados, não uma chamada única de LLM com regex:

1. Validar tipo, tamanho e hash do arquivo; guardar o original em armazenamento privado.
2. Extrair texto, com OCR quando o PDF for escaneado.
3. Classificar o relatório e identificar a casa.
4. Extrair observações com JSON Schema forçado (saída validada por schema, não recuperada por match genérico).
5. Validar campo a campo (ticker, moeda, preço, datas, instrumento) contra o cadastro canônico.
6. Persistir página e trecho de origem de cada informação.
7. Atribuir confiança por campo e mandar exceção para revisão humana.

O conteúdo do PDF é dado não confiável, delimitado no prompt; o modelo nunca executa instrução vinda do documento.

### Frente 3 — Consenso honesto e alertas de qualidade

Snapshot de consenso por instrumento canônico, não por ticker livre, guardando moeda, data-base, horizonte, data de publicação e rating original mais canonizado, com research vencido marcado.

Correção de premissa em relação ao método clássico: cada família recebe de uma ou duas casas, então não há consenso estatístico, há a cobertura de research disponível para aquela família. A régua é formal:

| Fontes válidas | Nome na UI | Comportamento |
|---|---|---|
| 1 | Visão da casa X | Exibe alvo e validade; não chama de consenso; no máximo alerta informativo |
| 2 | Duas visões disponíveis | Mostra ambos os alvos e o gap percentual; alerta de divergência, não conclusão direcional |
| 3 ou mais | Cobertura de research | Mediana, mínimo-máximo, dispersão e número de casas; ainda sem fingir consenso de mercado amplo |

Com uma única casa, mudança de rating é exibida como fato relevante daquela fonte, mas não vira ação sugerida por si só. Um alerta de preço-alvo só dispara com análise válida, na moeda certa, ponderado pela materialidade da posição. Ativo acima de um alvo vencido ou isolado não vira ação sugerida.

Preço-alvo não é universal: vale para ações e alguns casos de BDR e fundo. Tesouro, CDB, debênture, FII, ETF e fundo usam sinais próprios do instrumento.

### Frente 4 — Sugestões táticas e relatório semanal

Sugestão de ajuste de meta só dentro das bandas pré-aprovadas da política, validada pelo motor determinístico. Aplicar nunca sobrescreve meta em silêncio: a tela mostra antes e depois, impacto na alocação, restrições verificadas, versão da política, justificativa, aprovação explícita e reversão. Toda sugestão aplicada registra autoria, aprovação, rejeição e rollback.

Relatório semanal por família e titular: cenário atual e o que mudou, posições materialmente afetadas, e ação sugerida com a alternativa de não agir. Os alertas pontuais continuam para urgência real (fraude, rebaixamento forte, desenquadramento grave).

### Frente 5 — E-mail automático

Gmail API com conta dedicada e escopo mínimo, depois de validar o upload manual com relatórios reais. Idempotência por anexo e hash, auditoria do processamento. IMAP foi descartado por controle pior de autenticação, revogação e auditoria.

## 7. Modelo de dados

Tabelas novas, seguindo o padrão de `supabase/migrations/`. Valores financeiros em `numeric`, datas com timezone, RLS por `family_id` onde o dado é da família, global onde o dado é universal.

| Entidade | Escopo | Responsabilidade |
|---|---|---|
| `securities` | Global | Cadastro canônico: id interno, ISIN, ticker, bolsa, tipo, país, moeda, ativo subjacente |
| `market_data_snapshots` | Global | Preço, câmbio, curva e dados de mercado com fonte, timestamp e qualidade |
| `scenario_definitions` | Global | Cenário macro: drivers, premissas, gatilhos, probabilidades, evidências, versão |
| `family_scenario_implications` | Por família | Leitura do cenário por família e titular, sem duplicar o dado macro |
| `investment_policies` | Por titular | Política e limites versionados: objetivo, horizonte, liquidez, perda máxima, alocação, bandas |
| `research_reports` | Por família | Documento original, hash, casa, versão, origem, classificação, status de processamento |
| `research_observations` | Por família | Uma observação por ativo: `security_id`, rating original e canonizado, alvo, moeda, horizonte, página de origem, confiança |
| `consensus_snapshots` | Por família | Mediana, faixa, dispersão, número de casas, elegibilidade, data do cálculo |
| `strategy_suggestions` | Por família | Proposta, cenário, alvo anterior, restrições aplicadas, evidências, estado de aprovação |
| `family_members` | Por família | Vínculo usuário–família com papel (owner, admin, editor, viewer) |
| `audit_log` | Por família | Ação sensível: autor, alvo, antes e depois, timestamp |
| `conclusion_evidence` | Por família | Liga uma conclusão (alerta, sugestão, item do relatório) às suas fontes: snapshots, relatórios, páginas de PDF, política e versão de cenário |

Integridade: `security_id` na research, nunca ticker livre. Unicidade por hash de relatório. Constraint ou trigger garantindo que `report_id` e `family_id` são da mesma família. Casas, tipos de relatório, ratings e status normalizados por enum ou tabela de referência. PDF e texto extraído em armazenamento privado, com política de retenção e exclusão. Alertas com severidade, confiança, materialidade, cooldown, explicação e ação esperada.

Firewall no schema: `scenario_definitions` não referencia nenhuma tabela por família e só admite fonte pública ou própria. `family_scenario_implications` carrega linhagem explícita: cada conclusão personalizada aponta o `report_id` e a família de origem do dado que a sustentou. Não existe caminho de `research_*` de uma família para qualquer entidade global.

Evidência por conclusão. Toda conclusão exibida (alerta, sugestão, linha do relatório) aponta para `conclusion_evidence`, que liga a conclusão a um ou mais snapshots de mercado, relatórios, páginas de PDF, versão de política e versão de cenário. É isso que torna a explicabilidade verificável em vez de retórica: dado um alerta, dá para abrir exatamente quais fontes o sustentaram e em que versão.

A `market_scenarios` por família, proposta na v1, foi descartada em favor de `scenario_definitions` global mais `family_scenario_implications`.

## 8. Pré-condição regulatória e contratual

Bloqueante para abertura a terceiros, não para o MVP de uma família.

A barreira cobre a fase 3, não só a fase 4. Um alerta personalizado do tipo "sua posição está 20% acima do preço-alvo" já influencia decisão, e um relatório distribuído a terceiros sobre valores mobiliários específicos também entra no campo regulado. A CVM caracteriza consultoria como orientação, recomendação ou aconselhamento individualizado mesmo quando a execução fica com o cliente, e deixa claro que robô-consultor não afasta essas obrigações. A Resolução CVM 20 alcança relatórios destinados a terceiros que possam influenciar decisão de investimento.

A regra, então: nenhuma funcionalidade personalizada para terceiros, incluindo alerta e relatório por posição, é liberada antes do parecer jurídico. Isso não é parecer, é desenho de produto conservador até o parecer existir. Para a primeira família (o próprio operador decidindo sobre o próprio dinheiro), nada disso bloqueia. O parecer precisa responder o posicionamento: analytics informativo com decisão e execução sempre do usuário, versus recomendação personalizada e o ônus que vem junto.

Também é necessário validar termos de uso e licença do research de cada casa, retenção e não redistribuição, e os requisitos de LGPD para e-mail, anexos e documentos financeiros de terceiros, incluindo dados de menores.

Research como conteúdo confidencial de terceiro. RLS sozinho não protege o research. A pesquisa proprietária é classificada como confidencial: sem uso cross-tenant, sem treinamento de modelo, sem retenção fora da política, e com o provedor de IA contratado sob termos compatíveis. O teste adversarial cobre toda a superfície, não só a query SQL: Storage, URL assinada, cache, embeddings, log, prompt de LLM e qualquer dado derivado. O research da família A não pode aparecer, direta ou indiretamente, em nada servido à família B.

Cautela sobre o piloto. Rodar para a primeira família é um escopo operacional restrito, não uma declaração jurídica de isenção. O fato de hoje ser o próprio operador decidindo sobre o próprio dinheiro reduz o risco prático, não muda o enquadramento de direito. Nada aqui dispensa o parecer antes de terceiros.

### Os três gates de liberação

Cada gate trava uma transição específica. Nenhum é opcional, e eles são independentes: passar um não libera o outro.

| Gate | Trava | Libera quando |
|---|---|---|
| Gate A — isolamento técnico | A segunda família. Não se admite uma segunda família no banco enquanto o isolamento não estiver provado. | Teste adversarial passa em toda a superfície (SQL, Storage, URL assinada, cache, embeddings, log, prompt de LLM, dado derivado) sem nenhuma leitura cross-tenant; autorização por papéis e log de auditoria ativos. |
| Gate B — licença, LGPD e termos do LLM | Receber PDF de research de terceiros. | Licença e termos de uso do research de cada casa validados; base legal de LGPD para documentos financeiros de terceiros e dados de menores; provedor de IA sob termos compatíveis (sem treino, sem retenção fora da política). |
| Gate C — parecer CVM | Qualquer funcionalidade personalizada para terceiros: alerta, relatório por posição ou sugestão. | Parecer jurídico define o posicionamento (analytics informativo versus recomendação personalizada) e o que pode ser servido a terceiros. |

### Retenção e exclusão de dados

"Política de retenção" precisa ser regra concreta, ainda mais com research proprietário e dados de menores. Definir prazo de retenção para PDF original, texto de OCR, e-mail e anexo, log, embeddings e dado derivado. Exclusão de família apaga ou anonimiza todos esses artefatos, inclusive em armazenamento e cache, e o procedimento é auditável. Revogação de acesso de um membro é imediata e registrada. Backup tem prazo próprio e o processo de restauração respeita exclusões já pedidas (não ressuscita dado apagado a pedido). Os prazos exatos são ratificados junto da validação de LGPD do Gate B.

## 9. Fontes externas

BCB via API pública (Olinda para o Focus, SGS para séries), sem chave. FRED para o bloco de EUA (requer chave gratuita). Brave Search para notícia, cliente já existente. Research das casas via upload manual (frente 2) e depois Gmail API (frente 5).

Correção de série SGS apontada no review: não usamos o código 433 como IPCA 12 meses. Usamos 13522 (IPCA acumulado 12m, validado, 4,72%), 432 (meta Selic, 14,25%) e 1 (dólar venda PTAX, 5,14). Cada código tem teste de contrato contra a fonte; fonte, transformação e unidade são validadas explicitamente.

## 10. Agentes e rotas

Seguem o padrão atual: `POST` com header `x-agent-secret`, `maxDuration = 300`, lógica em `src/lib/`, saída validada por schema.

| Agente | Rota | Modelo | Frequência | Lógica em |
|---|---|---|---|---|
| `macro-scenario` | `/api/agents/macro-scenario` | Opus 4.7 | 1x/semana (seg 9h) | `src/lib/scenario/macro.ts` |
| `research-ingest` | `/api/agents/research-ingest` | Opus 4.7 (extração) | 2x/dia | `src/lib/research/ingest.ts` |
| `weekly-report` | `/api/agents/weekly-report` | Opus 4.7 | 1x/semana (seg 10h, após cenário) | `src/lib/reports/weekly.ts` |

Upload manual de research é Server Action `processResearchUpload`, não agente. O `weekly-report` só roda depois do cenário da semana concluído e validado (agendamento por dependência, não só por horário).

## 11. Governança da decisão e UX

Os cards de cenário e relatório respondem rápido a: o que mudou, por que importa para mim, quais posições são materialmente afetadas, e qual ação merece consideração. Cada conclusão mostra data e frescor, dados e research que a embasaram, confiança e limitações, evidências a favor e contra, impacto por titular respeitando a política, e a ação proposta com a alternativa de não agir. O "dados que embasaram" não é texto solto: vem de `conclusion_evidence`, então cada conclusão é clicável até a fonte e a versão.

Páginas e componentes: `/research` (lista, upload, observações por ativo), card de cenário no dashboard (base, otimista, pessimista com probabilidade), card de relatório semanal, e a seção de sugestão de meta no editor de estratégia com fluxo de antes e depois e rollback. Gráficos seguem SVG puro, convenção do projeto.

## 12. Arquitetura operacional

Rastreabilidade existe desde a primeira família, não é faseável. Já na largada: registro de execução, idempotência por execução e período de referência, inputs versionados, status de falha, reprocessamento manual e alerta operacional. Lock contra processamento concorrente e referência explícita aos snapshots e ao cenário usados pelo relatório. Teste de contrato das fontes externas e fallback controlado para o último dado válido.

O que é faseável é a infraestrutura mais pesada: retry sofisticado, dead-letter queue e modo sombra como gate de sugestão entram quando houver volume de terceiros, não na abertura.

## 13. Faseamento

Fundação em paralelo, não como portão: `investment_policies`, `securities` e o motor determinístico sobem junto das frentes, na medida em que cada uma precisa.

Fase 1: cenário macro informativo (Brasil mais bloco mínimo de EUA), global e versionado, com gatilhos, evidências e comparação semanal, saída validada por schema, card sem sugestão.

Fase 2: research manual auditável, isolado por família, com pipeline de extração, evidência por página e fila de exceção.

Fase 3: consenso elegível e honesto com poucas casas, alertas priorizados e explicáveis.

Fase 4: sugestões dentro de banda, aprovação versionada com antes e depois e rollback, relatório semanal.

Fase 5: e-mail automático via Gmail API.

Os três gates da seção 8 regem a abertura. Gate A (isolamento técnico provado) trava a entrada da segunda família. Gate B (licença, LGPD e termos do LLM) trava receber PDF de research de terceiros. Gate C (parecer CVM) trava qualquer funcionalidade personalizada para terceiros, das fases 3 e 4, incluindo alerta e relatório por posição. As fases 1 e 2 para a primeira família não dependem de nenhum dos três. A frente 4 também depende do inventário completo de dados do motor determinístico (seção 6): sem emissor, carência, FGC, duration e tributação, a validação de banda não libera.

## 14. Critérios de aceite

Nenhuma sugestão viola liquidez, limite de risco, instrumento permitido ou banda tática configurada. Cada dado exibido tem fonte, timestamp, unidade, moeda e metodologia. Ticker ambíguo, moeda incompatível, alvo vencido ou research de baixa confiança não gera consenso acionável. A extração é validada contra uma base de PDFs reais de XP e BTG, com métrica de precisão por campo. Cenários e relatórios são reproduzíveis a partir dos snapshots e versões persistidos.

O isolamento é testado de forma adversarial em toda a superfície, não só na query SQL: Storage, URL assinada, cache, embeddings, log, prompt de LLM e dado derivado. Nenhum research, texto extraído, relatório, conclusão ou sugestão de uma família aparece, direta ou indiretamente, para outra. Desde a primeira família existe registro de execução, idempotência, inputs versionados, status de falha e reprocessamento manual. Antes de permitir aprovar sugestão, o fluxo roda em modo sombra medindo falso positivo, sinal ignorado e utilidade percebida.

Metas mensuráveis, ratificadas com o revisor. A régua é número, não "precisão" ou "qualidade" no abstrato.

Extração de research. Para observação autoaceita, os campos críticos atingem precisão mínima medida contra a base de PDFs reais: ativo e moeda em 99,5% ou mais, rating e preço-alvo em 98,5% ou mais. A medição é por amostra mínima estratificada por casa e formato de PDF, não uma média geral que esconde um template ruim. Duas regras fecham o resto: toda ambiguidade, conflito ou baixa confiança vai para revisão humana; e nenhuma observação que alimente alerta ou sugestão é publicada sem evidência de página e trecho e sem validação.

Frescor de cenário. O frescor deriva do dado obrigatório mais antigo, não é resetado porque o agente rodou de novo com dado velho. O cenário fica `stale` após 8 dias sem atualização (mais de uma rodada Focus perdida). Após 15 dias, ou duas execuções semanais falhas, vira `unavailable`: o sistema deixa de exibir o cenário como utilizável, não só pendura um selo discreto de desatualizado.

Saída do modo sombra. Uma sugestão só passa de sombra para acionável com pelo menos 60 avaliações humanas, cobrindo os perfis, classes de ativo e tipos de cenário que de fato existem na carteira. Zero falso positivo crítico (ativo ou moeda errados, violação de política, de liquidez, de risco ou de tributação) e menos de 5% de falso positivo não crítico. A avaliação usa taxonomia clara: correta e útil, correta mas sem ação, incorreta, insegura.

Isolamento. Nenhum teste adversarial produz leitura cross-tenant, em nenhuma camada, inclusive cache e URL assinada. É binário: qualquer falha trava o Gate A.

Por fase: a fase 1 entrega o card de cenário com dado real da semana, Brasil mais EUA, sem sugestão. A fase 2 transforma um PDF da XP em observações com proveniência de página e confiança por campo. A fase 3 dispara alerta só com análise válida e ponderada por materialidade, e apresenta consenso honesto com o N de casas. A fase 4 mostra sugestão dentro de banda com antes e depois, aprovação versionada e rollback.

## 15. Riscos e mitigação

Extração de PDF heterogênea por casa: começar manual, validar contra PDFs reais antes de automatizar por e-mail. API externa muda formato ou cai: snapshot persistido e fallback para o último dado válido, com teste de contrato. Direito autoral e isolamento de research: research por família, sem redistribuição, em armazenamento privado. Cenário eleitoral sem fonte estruturada: input editável, não dado automático. Fronteira regulatória: validação jurídica como pré-condição de terceiros. Custo de Opus: volume baixo (semanal e por upload), news segue em Haiku.

## 16. Decisões em aberto

Em aberto, único bloqueante: o posicionamento regulatório (analytics informativo versus recomendação personalizada). Depende de parecer jurídico e trava toda funcionalidade personalizada para terceiros, das fases 3 e 4, incluindo alerta e relatório por posição. Não trava a primeira família nem a fase 1.

Resolvidas na réplica do revisor, agora decididas: a régua de consenso para N pequeno (tabela na frente 3). A profundidade do bloco internacional na fase 1 (Fed Funds, Treasury 2a e 10a, 2s10s, CPI cheio e núcleo; crédito só com exposição material). A cadência de calibração (registro com horizonte 1, 3 e 12 meses, avaliação mensal, disciplina qualitativa após 6 maturadas, métrica após 12, ajuste de peso só após 24+).

## 17. Notas de implementação

Os quatro arquivos da fase 1 escritos na v1 precisam de ajuste: a migration `0043_market_scenarios.sql` vira `scenario_definitions` global mais `family_scenario_implications`, e entra a migration de `investment_policies` e `securities`. O `src/lib/scenario/macro.ts` troca o parse por regex por saída validada por schema e deixa de gravar por família (passa a gravar cenário global mais implicação por família). O `src/lib/scenario/bcb.ts` ganha o bloco FRED de EUA. A rota `macro-scenario` segue igual. Após aplicar as migrations, regenerar os tipos do Supabase antes de o código compilar.
