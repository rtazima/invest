# Devolutiva à revisão de produto — Analisador profissional

Resposta ao documento "Revisão de Produto — Analisador Profissional de Investimentos" (23/06/2026)
Autor da devolutiva: Rodrigo Tazima (com time de eng)
Data: 23/06/2026
Status: resposta ponto a ponto, com decisões e itens devolvidos ao revisor

## Contexto que mudou desde o seu review

Quando o PRD foi escrito, o produto era uma ferramenta de uso de uma única família (a minha). Entre a sua revisão e esta resposta, a decisão de escopo mudou: já há outras famílias querendo usar, então a plataforma passa a ser multi-família.

Isso é relevante porque muda o peso de várias das suas recomendações. Vários pontos que, num app de uma família só, eu trataria como excesso, com terceiros usando viram necessidade real: isolamento de dados por família, privacidade dos PDFs de research, teste adversarial de RLS, e a fronteira regulatória entre analytics informativo e recomendação personalizada de investimento a terceiros. Então a leitura abaixo já incorpora o novo escopo.

Resumo da nossa posição: aceitamos a maior parte da revisão, com nosso próprio sequenciamento. Discordamos em dois pontos de proporcionalidade, corrigimos uma premissa que ficou de fora (consenso com poucas casas) e elevamos um item que você levantou e que o novo escopo torna bloqueante (enquadramento regulatório).

## Resposta aos achados P0

| Achado | Decisão | Observação |
|---|---|---|
| Separar política de investimento de sugestão por IA | Aceito integral | Vira a fundação. Política versionada e determinística; IA só sugere dentro das bandas; motor valida antes de qualquer sugestão existir. |
| Consenso de research financeiramente comparável | Aceito com correção | O princípio está certo. Mas a realidade de poucas casas por família muda o que dá pra chamar de consenso. Ver seção própria. |
| Cobrir de fato a dimensão internacional | Aceito e ampliado | Vamos mais longe que o review: bloco mínimo de EUA (Fed, Treasury 10a, CPI) via FRED já na fase 1, por causa do patrimônio real em USD (Nomad). |
| Ingestão de research auditável | Aceito integral | Pipeline com validação por schema, OCR quando preciso, proveniência por página, confiança por campo e fila de exceção. Conteúdo do PDF tratado como dado não confiável. |
| Enquadramento regulatório e contratual | Aceito e elevado a bloqueante | Com terceiros usando, deixa de ser cautela e vira pré-condição. Ver seção própria. |

### Política versus IA

Aceito sem ressalva, e ela passa a ser a primeira coisa a construir. Cada titular ganha uma política explícita e versionada com objetivo, horizonte, liquidez mínima, perda máxima tolerada, alocação estratégica de longo prazo e bandas táticas por classe. O cenário macro só pode propor ajuste tático dentro dessas bandas. A IA explica a proposta, os dados que a sustentam e as evidências contrárias; um motor determinístico garante que nenhuma sugestão fure a política. Em multi-família, a política também passa a ser o registro auditável que separa "o que a família definiu" de "o que o modelo opinou".

Concordamos também com a correção do exemplo de liquidez. Tratar prefixado curto como caixa de curto prazo estava errado no PRD. Liquidez, possibilidade de resgate, marcação a mercado, risco de crédito e tributação são dimensões separadas e vão ser modeladas separadamente.

### Consenso de research: onde corrigimos a premissa

O método que você descreve (mesmo instrumento canônico, moeda, data-base, horizonte, validade, mediana com dispersão, número mínimo de casas, materiality) está certo como engenharia. A premissa que falta no review é a contagem de fontes.

Cada família recebe research das próprias corretoras, e na prática isso é duas casas (XP e BTG), às vezes uma. Mediana, dispersão e "mínimo de casas" pressupõem amostra. Com uma ou duas fontes por ativo, na maioria dos papéis não existe distribuição, existe um ou dois alvos. Forçar linguagem de consenso estatístico aqui seria vender precisão que o dado não tem.

Nossa decisão: o schema guarda tudo que você pediu (moeda, datas, horizonte, validade, instrumento, rating original e canonizado), mas a apresentação é honesta com o N. Com uma casa, mostramos "visão da casa X", não consenso. Com duas, mostramos as duas e a divergência entre elas explícita. O alerta de preço-alvo só dispara com análise válida (não vencida), na moeda certa, e ponderado pela materialidade da posição. Um ativo 20% acima de um alvo vencido ou isolado não vira ação sugerida. Isso é o seu critério, com a régua ajustada à realidade de poucas fontes.

Além disso, concordamos que preço-alvo não é métrica universal. Ele se aplica a ações e alguns casos de BDR e fundo. Para Tesouro, CDB, debênture, FII, ETF e fundo, a análise usa sinais próprios do instrumento, não alvo de preço.

### Internacional

Aqui puxamos mais forte que a revisão. Não vamos declarar "Brasil-only" e empurrar o internacional pra depois, porque o patrimônio em dólar é material desde já. A fase 1 inclui um bloco macro mínimo de EUA (juro de política, Treasury de 10 anos, inflação), via FRED, que é fonte oficial e gratuita. Não é o aparato global inteiro, mas o cenário deixa de ler bolsa internacional só pela variável dólar, que era a sua crítica e está correta.

A modelagem de moeda-base por família, conversão cambial com timestamp, preços e calendários de mercado para ativos estrangeiros, e o tratamento tributário (retenção de dividendo, ganho em moeda, custo de câmbio) entram no backlog priorizado junto com o cadastro de instrumentos. Concordamos que o produto não pode prometer leitura internacional que não sustenta.

### Ingestão auditável

Aceito como você desenhou. A extração vira pipeline, não chamada única de LLM com regex: validação de arquivo e hash, armazenamento privado do original, OCR quando necessário, classificação e identificação da casa, extração com JSON Schema, validação de ticker/moeda/preço/datas/instrumento contra o cadastro canônico, proveniência de página por campo, confiança por campo e fila de revisão para exceção. O conteúdo do PDF é tratado como dado não confiável e delimitado no prompt, sem executar instrução vinda do documento.

Esse mesmo princípio de saída validada por schema, e não por match genérico de JSON, vamos aplicar de volta aos agentes que já existem, inclusive o de cenário macro que escrevemos com parse por regex.

### Enquadramento regulatório: agora é bloqueante

No PRD eu afirmei que a ingestão era permitida porque o usuário é o destinatário do relatório. Você apontou que isso não se sustenta como afirmação geral, e com multi-família esse argumento cai de vez: o research que a família A recebe da XP não pode ser usado para a família B. Cada research fica isolado à família que o recebeu, por RLS e por contrato.

Mais sério que isso: oferecer sugestão tática personalizada de investimento a terceiros toca a fronteira de consultoria e análise de valores mobiliários no Brasil (regras da CVM). Enquanto era uma família só, decidindo sobre o próprio dinheiro, isso não existia como risco. Servindo outras famílias, existe. Nossa decisão: antes de onboarding de terceiros, validamos juridicamente o enquadramento e o posicionamento do produto (analytics informativo com decisão e execução sempre do usuário, versus recomendação personalizada). Isso vira pré-condição da fase de multi-família, não um detalhe de disclaimer. O MVP de uma família segue, o de terceiros não liga até essa validação fechar.

## Capacidades analíticas que faltam

Aceitamos a tabela de domínios (exposição, renda fixa BR, risco, tributação, exterior, fundos e FIIs, alertas) como backlog priorizado, não como pré-requisito monolítico. A profundidade entra por instrumento e por fase, na medida em que cada frente precisa. O ponto de que cada alerta precisa de severidade, confiança, materialidade, cooldown, explicação e ação esperada já está alinhado e vamos formalizar no schema de alertas.

## Modelo de dados

Aceitamos as entidades novas que você propôs, e com multi-família elas deixam de ser opcionais:

- `securities` como cadastro canônico, com `security_id` usado na research no lugar de ticker livre.
- `market_data_snapshots` para preço, câmbio e curva com fonte, timestamp e qualidade.
- `research_observations` com uma observação por ativo, instrumento, rating original e canonizado, alvo, moeda, horizonte, página de origem e confiança.
- `consensus_snapshots` com mediana, faixa, dispersão, número de casas e elegibilidade, lembrando da régua de poucas fontes acima.
- `investment_policies` versionada por titular.
- `strategy_suggestions` com proposta, cenário, alvo anterior, restrições aplicadas, evidências e estado de aprovação.
- `scenario_definitions` como cenário macro global.
- `family_scenario_implications` para a leitura por família, sem duplicar o dado macro.

Adotamos também os pontos de integridade: unicidade por hash de relatório, constraint garantindo que `report_id` e `family_id` são da mesma família, normalização de casas, tipos e ratings, e armazenamento privado de PDF e texto com política de retenção. Em multi-família, a constraint de coerência entre `report_id` e `family_id` e o teste adversarial de RLS sobre PDFs e textos extraídos passam a ser item de aceite, não recomendação.

A consequência direta: descartamos a `market_scenarios` por família que estava na nossa migration inicial. O cenário macro vira global (`scenario_definitions`), interpretado por família (`family_scenario_implications`), exatamente como você sugeriu.

## Cenário macro

Aceito o desenho: produzir uma vez para o mercado e interpretar por família. Cada cenário guarda data e hora de referência de cada entrada, probabilidades que somam 100%, premissas quantificadas, gatilhos de mudança de probabilidade, evidências contrárias, implicações por exposição e instrumento, e comparação com a versão anterior e com o que ocorreu.

Sobre probabilidades, concordamos: o modelo propõe e justifica, mas o usuário ancora e aprova, e a calibração é acompanhada ao longo do tempo. A estimativa autônoma do LLM não é aceita como verdade.

Sobre os códigos SGS, esclareço: não usamos o 433 como IPCA 12 meses. Usamos 13522 (IPCA acumulado 12m, validado contra a fonte, retornou 4,72%), 432 (meta Selic, 14,25%) e 1 (dólar venda PTAX, 5,14). Cada código tem teste de contrato contra a API do BCB. O seu alerta sobre validar fonte, transformação e unidade está incorporado.

## Experiência e governança da decisão

Aceito integral. Cada conclusão mostra data e frescor, dados e research que a embasaram, confiança e limitações, evidências a favor e contra, impacto por titular respeitando a política, e a ação proposta com a alternativa de não agir. Aplicar uma sugestão nunca sobrescreve meta em silêncio: a tela mostra antes e depois, impacto na alocação, restrições verificadas, versão da política, justificativa, aprovação explícita e reversão.

## Arquitetura operacional

Aceito agendamento por dependência (o relatório semanal só roda depois do cenário concluído e validado) e idempotência por período de referência. Com multi-família, locks contra processamento concorrente e observabilidade de job entram de fato. Dead-letter queue e modo sombra como gate obrigatório nós faseamos: justificáveis quando houver volume de terceiros, não na largada de uma plataforma que ainda valida o primeiro punhado de famílias. Para e-mail, fechamos com Gmail API, conta dedicada e escopo mínimo, depois de validar o upload manual com relatórios reais de XP e BTG.

## Onde divergimos

Dois pontos, ambos de proporcionalidade e sequência, não de princípio.

Primeiro, não tratamos a sua "fase 0 de fundações" como um portão único que trava toda entrega de valor. Concordamos com o conteúdo dela (cadastro de instrumentos, política, motor determinístico, taxonomia Brasil e exterior). Discordamos de empilhar tudo antes de qualquer coisa visível. Nosso plano sobe a política de investimento e o cadastro canônico em paralelo com um cenário macro informativo, que não dá sugestão nenhuma e portanto não depende do motor determinístico para existir com segurança. Assim a primeira entrega é cedo e de baixo risco, e as fundações sobem por baixo sem segurar a régua.

Segundo, a régua de consenso, já detalhada: mantemos seu método, ajustamos a apresentação para a realidade de uma a duas casas por família.

## Faseamento que propomos

Fundação em paralelo, não como portão: `investment_policies` por titular, `securities` canônico, e o motor determinístico de validação de banda. Sobem junto das fases abaixo, na medida em que cada uma precisa.

Fase 1, cenário macro informativo: Brasil (BCB e Focus) mais bloco mínimo de EUA (FRED), cenário global versionado com gatilhos, evidências e comparação semanal, saída validada por schema, card sem nenhuma sugestão de estratégia.

Fase 2, research manual auditável: upload de PDF de XP e BTG, pipeline de extração com validação, evidência por página e fila de exceção, isolado por família.

Fase 3, consenso elegível e alertas de qualidade: snapshot por instrumento, régua de validade, moeda, horizonte e materialidade, apresentação honesta com poucas casas, alertas priorizados e explicáveis.

Fase 4, sugestões táticas e relatório semanal: sugestão só dentro de banda pré-aprovada, aprovação versionada com antes e depois e rollback, relatório por família e titular.

Fase 5, e-mail automático: Gmail API, conta dedicada, idempotência por anexo e hash.

Pré-condição transversal da abertura a terceiros: validação jurídica do enquadramento (CVM, LGPD para documentos de terceiros, licença do research por casa) e teste adversarial de RLS. Sem isso, o produto roda para a primeira família, não para fora.

## Itens que devolvemos para você e para o jurídico

- Posicionamento regulatório: o produto se declara analytics informativo com decisão e execução sempre do usuário, ou assume a fronteira de recomendação personalizada e o ônus regulatório que vem junto? Essa resposta muda a fase 4 inteira.
- Régua de elegibilidade de consenso para uma a duas casas: a partir de quantas observações válidas faz sentido exibir faixa e dispersão, e abaixo disso o que mostramos.
- Profundidade mínima do bloco internacional na fase 1: Fed, Treasury 10a e CPI cobrem o suficiente para uma leitura de cenário, ou você considera Treasury de outros vértices e crédito necessários já de saída.
- Calibração de probabilidade: a partir de qual histórico passa a valer a pena comparar probabilidade proposta contra realizado, dado que cenário é semanal e a amostra demora a encorpar.

## Fecho

A revisão melhorou o produto. O eixo, tirar a IA do papel de definidora de política e colocá-la como sintetizadora de evidência em cima de uma base determinística e auditável, é o que vamos seguir. A mudança para multi-família reforça quase tudo que você escreveu, e por isso aceitamos mais do que aceitaríamos para uma família só. Onde divergimos é em sequência e em uma régua de realidade sobre quantas casas de research a gente de fato tem, não no destino.
