import Anthropic from "@anthropic-ai/sdk";
import type { JudgeResult } from "@/lib/data/council";

const JUDGE_MODEL = "claude-haiku-4-5-20251001";

const JUDGE_SYSTEM = `Você é um moderador objetivo de um debate de investimentos. Sua única tarefa é avaliar se os participantes chegaram a uma conclusão comum e acionável. Seja preciso e imparcial. Responda SEMPRE em JSON válido, sem markdown, sem texto fora do JSON.`;

interface JudgeInput {
  participantName: string;
  roleFocus: string;
  content: string;
}

export async function judgeRound(
  round: number,
  messages: JudgeInput[],
): Promise<JudgeResult> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const messagesSection = messages
    .map((m) => `=== ${m.participantName} (${m.roleFocus || "análise geral"}) ===\n${m.content}`)
    .join("\n\n");

  const userPrompt = `Estas são as mensagens da Rodada ${round}:

${messagesSection}

Os participantes chegaram a uma conclusão comum e acionável sobre alocação ou estratégia?

Responda APENAS com JSON válido neste formato exato:
{
  "converged": true,
  "summary": "resumo de 2 a 3 frases do que foi discutido e concluído",
  "key_disagreements": []
}

Se não convergiram:
{
  "converged": false,
  "summary": "resumo do que foi discutido",
  "key_disagreements": ["ponto de divergência 1", "ponto de divergência 2"]
}`;

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 512,
      system: JUDGE_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = msg.content[0];
    if (block?.type !== "text") throw new Error("Resposta inesperada do juiz");

    const text = block.text.trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("JSON não encontrado na resposta");

    return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as JudgeResult;
  } catch {
    return { converged: false, summary: "Avaliação de convergência indisponível.", key_disagreements: [] };
  }
}
