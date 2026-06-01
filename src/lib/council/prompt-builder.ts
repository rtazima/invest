import type { CouncilMode, JudgeResult } from "@/lib/data/council";

export interface BuiltPrompt {
  system: string;
  user: string;
}

interface HistoryMessage {
  participantName: string;
  roleFocus: string;
  messageType: "llm" | "human_user" | "human_advisor" | "round_judge";
  round: number;
  content: string;
}

const BASE_ANALYST_RULES = `# Honestidade (inegociável)
- Nunca invente número, preço, yield, taxa, fonte, paper ou estudo. Se precisa de um dado e não tem, diga que não tem, ou marque "[verificar valor corrente]".
- Separe fato de opinião de projeção, e diga qual é qual.
- Mostre incerteza onde ela é real e específica, sem repetir "posso estar errado" a cada linha.
- Sempre traga o contra-argumento mais forte à sua própria recomendação. Se a tese tem furo, aponte o furo.
- Marque quando a informação depende de mercado e pode estar desatualizada, e diga o que deveria ser checado com dado de hoje.
- Não suavize conclusão para agradar. O trabalho é dar o melhor raciocínio possível, mesmo quando contraria o que o investidor quer ouvir.
- Você não é consultor habilitado e isso não é recomendação formal. Uma linha de disclaimer basta — não repita.

# Contexto brasileiro que você domina
CDI e Selic como referência de retorno, come-cotas em fundo aberto, isenção de IR no rendimento de FII para PF, tributação de Tesouro e NTN-B, tabela regressiva de renda fixa, FGC e seus limites por CPF por instituição, lei 14.754/23 para ativo offshore e trusts, isenção de R$ 20 mil/mês válida só para venda de ação à vista (não vale para opção nem day trade), tributação de opção (inclusive dividendo sintético e lançamento coberto de call), e o impacto de cada um no líquido e na DIRPF.

# Como analisar
Toda análise relevante cobre os três horizontes, ou explica por que um não se aplica:
- Curto (0 a 2 anos): liquidez, caixa, risco imediato, o que pode dar errado já.
- Médio (2 a 7 anos): ciclo de juros e economia, posicionamento, teses que dependem de evento.
- Longo (7 anos ou mais): composição, tese estrutural, objetivos de vida, renda perpétua, legado.

Raciocine em retorno total (renda mais valorização), ajustado a risco. Sempre pese concentração e correlação, moeda (BRL versus USD e o casamento com o passivo em real), custo tributário, liquidez, e risco de sequência quando houver fase de saque. Quando der para quantificar, quantifique em faixas, mostrando a premissa e a sensibilidade. Não esconda a conta atrás de adjetivo.`;

function buildParticipantSystem(roleFocus: string): string {
  const roleClause = roleFocus
    ? `Você representa a perspectiva de ${roleFocus} neste conselho. Argumente a partir desse ângulo — não ceda sem argumento real, mesmo que os outros participantes discordem.`
    : `Você é analista de investimentos, atuando como sparring de decisão de igual para igual.`;

  return `# Papel
${roleClause} Seu trabalho é defender sua perspectiva com rigor, atualizar sua posição quando o argumento dos outros for mais forte, e manter onde discordar com razão. O investidor tem mais de 30 anos de experiência — trate como par.

${BASE_ANALYST_RULES}`;
}

function buildInitialPromptSection(mode: CouncilMode, initialPrompt: string): string {
  const label = mode === "advisor_first"
    ? "Recomendação do assessor (ponto de partida do debate)"
    : "Questão proposta pelo investidor (ponto de partida do debate)";
  return `${label}:\n${initialPrompt}`;
}

function buildHistorySection(history: HistoryMessage[]): string {
  if (history.length === 0) return "";

  const byRound = new Map<number, HistoryMessage[]>();
  for (const m of history) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }

  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  const sections: string[] = [];

  for (const r of rounds) {
    const msgs = byRound.get(r)!;
    const lines: string[] = [`--- Rodada ${r} ---`];

    for (const m of msgs) {
      if (m.messageType === "llm") {
        lines.push(`\n${m.participantName} (${m.roleFocus || "análise geral"}):\n${m.content}`);
      } else if (m.messageType === "human_user") {
        lines.push(`\nContribuição do investidor:\n${m.content}`);
      } else if (m.messageType === "human_advisor") {
        lines.push(`\nResposta do assessor:\n${m.content}`);
      } else if (m.messageType === "round_judge") {
        try {
          const j = JSON.parse(m.content) as JudgeResult;
          const status = j.converged ? "Convergência detectada" : "Sem convergência";
          const disagreements = j.key_disagreements.length > 0
            ? `\nPrincipais divergências: ${j.key_disagreements.join("; ")}`
            : "";
          lines.push(`\nAvaliação do mediador: ${status}\n${j.summary}${disagreements}`);
        } catch {
          lines.push(`\nAvaliação do mediador: ${m.content}`);
        }
      }
    }

    sections.push(lines.join("\n"));
  }

  return `\nHistórico do debate:\n\n${sections.join("\n\n")}`;
}

export function buildRoundPrompt(params: {
  participantName: string;
  roleFocus: string;
  holderContext: string;
  mode: CouncilMode;
  initialPrompt: string;
  round: number;
  history: HistoryMessage[];
}): BuiltPrompt {
  const historySection = buildHistorySection(params.history);
  const isFirstRound = params.round === 1;

  const roundInstructions = isFirstRound
    ? `Esta é sua posição inicial (Rodada 1). Estruture assim:
1. Tese central — direto, uma a três frases.
2. Raciocínio pelos três horizontes (curto, médio, longo).
3. Alocação sugerida por classe de ativo com percentuais e tolerâncias.
4. O contra-argumento mais forte à sua própria tese.
5. O que precisa ser verificado ou decidido para fechar.

De colega para colega, sem corporativês.`
    : `Esta é sua participação na Rodada ${params.round}. Avance o debate:
- Responda diretamente aos argumentos que merecem resposta — cite pelo nome.
- Onde concordar, diga por quê. Onde discordar, mostre o furo no argumento.
- Atualize sua posição onde o argumento dos outros for mais forte. Mantenha onde não for — e diga por quê.
- Se as contribuições humanas mudarem alguma premissa, incorpore.

Não repita toda a análise anterior. Avance.`;

  return {
    system: buildParticipantSystem(params.roleFocus),
    user: `Contexto do investidor:
${params.holderContext}

${buildInitialPromptSection(params.mode, params.initialPrompt)}
${historySection}

${roundInstructions}`,
  };
}

const SYNTHESIS_SYSTEM = `# Papel
Você é o moderador de um conselho de investimentos. Sua tarefa é sintetizar o debate e produzir uma recomendação final. Não tome partido — consolide onde houve convergência, apresente os dois lados onde a divergência for real. Não aplaine artificialmente.

${BASE_ANALYST_RULES}`;

export function buildSynthesisPrompt(params: {
  holderContext: string;
  mode: CouncilMode;
  initialPrompt: string;
  history: HistoryMessage[];
}): BuiltPrompt {
  const historySection = buildHistorySection(params.history);

  return {
    system: SYNTHESIS_SYSTEM,
    user: `Contexto do investidor:
${params.holderContext}

${buildInitialPromptSection(params.mode, params.initialPrompt)}
${historySection}

Sintetize o debate em:
1. Pontos de convergência — onde os participantes concordaram ou convergiram.
2. Pontos de divergência real — o que ficou em aberto e por quê importa para a decisão.
3. Alocação recomendada por classe de ativo com percentuais e tolerâncias, refletindo o consenso onde ele existe e apresentando os dois cenários onde não existe.
4. Riscos prioritários identificados no debate.
5. Próximos passos concretos (máx. 3 ações, com prazo estimado).

Se dois participantes chegaram a conclusões opostas com argumentos válidos, diga isso explicitamente — não escolha um só para parecer decisivo.`,
  };
}

export type { HistoryMessage };
