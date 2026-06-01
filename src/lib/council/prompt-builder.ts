interface MessageRef {
  participantName: string;
  roleFocus: string;
  content: string;
}

export function buildRound1Prompt(params: {
  participantName: string;
  roleFocus: string;
  holderContext: string;
}): string {
  return `Você é ${params.participantName}, atuando como consultor com foco em: ${params.roleFocus || "análise geral"}.

Contexto do investidor:
${params.holderContext}

Dê sua recomendação de alocação estratégica de longo prazo considerando seu foco. Seja direto, técnico e específico. Estruture sua resposta em:
1. Diagnóstico atual (1-2 frases)
2. Principais recomendações (3-5 pontos objetivos)
3. Alocação sugerida por classe de ativo com percentuais
4. Principais riscos a monitorar`;
}

export function buildRound2Prompt(params: {
  participantName: string;
  roleFocus: string;
  holderContext: string;
  otherMessages: MessageRef[];
}): string {
  const othersSection = params.otherMessages
    .map((m) => `=== ${m.participantName} (${m.roleFocus || "sem foco definido"}) ===\n${m.content}`)
    .join("\n\n");

  return `Você é ${params.participantName}, atuando como consultor com foco em: ${params.roleFocus || "análise geral"}.

Contexto do investidor:
${params.holderContext}

As recomendações iniciais dos outros participantes foram:

${othersSection}

Com base nisso, posicione-se:
1. Com quais pontos concorda e por quê?
2. Com quais discorda ou tem ressalvas? Seja específico.
3. Sua posição refinada após o debate — o que mantém, o que revisa?`;
}

export function buildSynthesisPrompt(params: {
  holderContext: string;
  round1Messages: MessageRef[];
  round2Messages: MessageRef[];
}): string {
  const formatRound = (messages: MessageRef[]) =>
    messages
      .map((m) => `=== ${m.participantName} (${m.roleFocus || "sem foco definido"}) ===\n${m.content}`)
      .join("\n\n");

  const debateSection =
    params.round2Messages.length > 0
      ? `\nRodada 2 — Debate:\n${formatRound(params.round2Messages)}`
      : "";

  return `Você é o moderador de um conselho de investimentos familiar. Sua tarefa é sintetizar o debate e produzir uma recomendação final.

Contexto do investidor:
${params.holderContext}

Rodada 1 — Posições iniciais:
${formatRound(params.round1Messages)}
${debateSection}

Sintetize em:
1. Pontos de convergência entre os participantes
2. Pontos de divergência e como equilibrá-los
3. Recomendação final de alocação por classe de ativo com percentuais e tolerâncias
4. Próximos passos concretos (máx. 3 ações)`;
}
